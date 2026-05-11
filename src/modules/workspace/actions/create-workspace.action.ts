'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import { runWithActor } from '@/lib/context/actor-context';
import {
  clearAuthCookie,
  getAuthCookie,
  getUserSession,
  setAuthCookies,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  createWorkspaceActionSchema,
  createWorkspaceSchema,
  type CreateWorkspaceActionInput,
  type CreateWorkspaceDomain,
} from '@/modules/workspace/schema';
import { createWorkspaceWorkflow } from '@/modules/workspace/workflows/create-workspace.workflow';
import {
  buildFinalSessionWorkflow,
  resolveWorkspaceSurfaceRedirect,
} from '@/modules/auth/workflows/post-login.workflow';
import {
  buildWorkspaceRoutingCachePayload,
  cacheWorkspaceSlug,
} from '@/modules/workspace/services/routing-cache.services';

const createWorkspaceActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: CreateWorkspaceActionInput =
    createWorkspaceActionSchema.parse(raw);
  const domain: CreateWorkspaceDomain = createWorkspaceSchema.parse(parsed);

  const identitySession = await getUserSession();
  const auth = await getAuthCookie();

  if (!identitySession?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Login session missing');
  }

  if (!auth) {
    throwError(ERR.INVALID_STATE, 'Auth flow missing');
  }

  if (
    auth.flow !== 'signup' ||
    auth.mode !== 'normal' ||
    auth.entry !== 'platform'
  ) {
    throwError(
      ERR.UNAUTHORIZED,
      'Workspace creation is not available in this flow',
    );
  }

  if (auth.workspaceId) {
    await setAuthCookies({
      data: {
        ...auth,
        createdAt: Date.now(),
      },
    });

    redirect('/post-login');
  }

  const result = await runWithActor(
    {
      actorType: 'system',
      permissions: [],
      isPlatformAdmin: true,
    },
    () =>
      createWorkspaceWorkflow({
        identityId: identitySession.identityId,
        workspaceName: domain.workspaceName,
        workspaceSlug: domain.workspaceSlug,
        intent: auth.intent,
      }),
  );

  await cacheWorkspaceSlug(
    result.slug,
    buildWorkspaceRoutingCachePayload({
      workspaceId: result.workspaceId,
      slug: result.slug,
      isActive: result.isActive,
      primaryDomain: result.primaryDomain,
    }),
  );

  await setAuthCookies({
    data: {
      ...auth,
      workspaceId: result.workspaceId,
      createdAt: Date.now(),
    },
  });

  const finalSession = await buildFinalSessionWorkflow({
    identitySession,
    workspaceId: result.workspaceId,
    workspaceMembership: {
      id: result.membershipId,
      workspaceId: result.workspaceId,
      roleDefinitionId: result.roleDefinitionId,
      roleKey: result.roleKey,
      roleSystemKey: result.roleSystemKey ?? undefined,
    },
  });

  await setUserSession(finalSession);
  await clearAuthCookie();

  redirect(
    await resolveWorkspaceSurfaceRedirect({
      workspaceId: result.workspaceId,
      fallbackPath: '/app',
    }),
  );
});

export async function createWorkspaceAction(formData: FormData) {
  return createWorkspaceActionImpl(formData);
}
