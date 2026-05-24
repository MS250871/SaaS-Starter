'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createNavAction } from '@/lib/http/create-nav-action';
import { resolvePublicRedirectTarget } from '@/lib/http/resolve-public-redirect';
import { resolvePublicHostname } from '@/lib/http/public-url';
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
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import {
  buildHostTransferPath,
  issueHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';
import {
  buildNavErrorAudit,
  getNavAuditState,
  setNavAuditState,
} from '@/modules/auth/auth-nav-audit';

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

    redirect(await resolvePublicRedirectTarget('/post-login'));
  }

  const result = await runWithActor(
    {
      actorType: 'system',
      permissions: [],
      features: [],
      limits: {},
      isPlatformAdmin: true,
    },
    () =>
      createWorkspaceWorkflow({
        identityId: identitySession.identityId,
        workspaceName: domain.workspaceName,
        workspaceSlug: domain.workspaceSlug,
        intent: auth.intent,
        pendingPriceId: auth.pendingPriceId,
        pendingPaymentId: auth.pendingPaymentId,
        pendingSubscriptionId: auth.pendingSubscriptionId,
      }),
  );

  setNavAuditState({
    scope: 'SYSTEM',
    category: 'WORKSPACE',
    source: 'AUTH',
    action: 'workspace.create',
    entityType: 'Workspace',
    entityId: result.workspaceId,
    description: `Workspace ${result.slug} created.`,
    metadata: {
      intent: result.intent,
      membershipId: result.membershipId,
      roleKey: result.roleKey,
      roleSystemKey: result.roleSystemKey ?? null,
      routingStrategy: result.routingStrategy,
      slug: result.slug,
      subscriptionId: result.subscriptionId ?? null,
    },
  });

  await setAuthCookies({
    data: {
      ...auth,
      workspaceId: result.workspaceId,
      createdAt: Date.now(),
    },
  });

  const redirectPath = await resolveWorkspaceSurfaceRedirect({
    workspaceId: result.workspaceId,
    fallbackPath: '/app',
  });
  const hdrs = await headers();
  const currentHost = resolvePublicHostname({
    host: hdrs.get('host'),
    forwardedHost: hdrs.get('x-forwarded-host'),
  });

  if (
    result.routingStrategy !== 'free_path' &&
    result.primaryDomain &&
    currentHost !== normalizeHostname(result.primaryDomain)
  ) {
    const token = await issueHostTransferToken({
      session: identitySession,
      workspaceId: result.workspaceId,
      targetHost: result.primaryDomain,
      intent: result.intent,
      returnPath: redirectPath,
    });

    await clearAuthCookie();

    redirect(buildHostTransferPath(token));
  }

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

  redirect(redirectPath);
}, {
  audit: {
    onSuccess: () => getNavAuditState(),
    onError: ({ error, state }) =>
      buildNavErrorAudit({
        action: 'workspace.create',
        description: 'Workspace creation failed.',
        error,
        state: state as ReturnType<typeof getNavAuditState>,
        category: 'WORKSPACE',
        source: 'AUTH',
        entityType: 'Workspace',
      }),
  },
});

export async function createWorkspaceAction(formData: FormData) {
  return createWorkspaceActionImpl(formData);
}
