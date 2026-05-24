'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import { getRequestContext } from '@/lib/context/request-context';
import { resolvePublicRedirectTarget } from '@/lib/http/resolve-public-redirect';
import {
  clearAuthCookie,
  clearUserSession,
  clearVerificationSession,
  getUserSession,
} from '@/lib/auth/auth-cookies';
import { logoutWorkflow } from '@/modules/auth/workflows/logout.workflow';
import { buildWorkspaceLoginPath } from '@/modules/workspace/routing';
import {
  buildNavErrorAudit,
  getNavAuditState,
  setNavAuditState,
} from '@/modules/auth/auth-nav-audit';

const logoutActionImpl = createNavAction(async () => {
  const session = await getUserSession();
  const requestContext = getRequestContext();

  await logoutWorkflow({
    sessionId: session?.sessionId,
  });

  setNavAuditState({
    category: 'AUTH',
    action: 'auth.logout',
    entityType: 'Session',
    entityId: session?.sessionId ?? null,
    description: 'Session logged out.',
  });

  await clearAuthCookie();
  await clearVerificationSession();
  await clearUserSession();

  if (requestContext.workspace?.workspaceId) {
    redirect(
      await resolvePublicRedirectTarget(
        buildWorkspaceLoginPath({
          workspaceId: requestContext.workspace.workspaceId,
          intent:
            requestContext.workspace.strategy === 'free_path' ? 'free' : 'paid',
          strategy: requestContext.workspace.strategy,
          slug: requestContext.workspace.slug,
        }),
      ),
    );
  }

  redirect(await resolvePublicRedirectTarget('/login'));
}, {
  audit: {
    onSuccess: () => getNavAuditState(),
    onError: ({ error, state }) =>
      buildNavErrorAudit({
        action: 'auth.logout',
        description: 'Logout failed.',
        error,
        state: state as ReturnType<typeof getNavAuditState>,
        entityType: 'Session',
      }),
  },
});

export async function logoutAction() {
  return logoutActionImpl();
}
