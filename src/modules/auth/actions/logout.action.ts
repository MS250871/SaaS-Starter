'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import { getRequestContext } from '@/lib/context/request-context';
import {
  clearAuthCookie,
  clearUserSession,
  clearVerificationSession,
  getUserSession,
} from '@/lib/auth/auth-cookies';
import { logoutWorkflow } from '@/modules/auth/workflows/logout.workflow';
import { buildWorkspaceLoginPath } from '@/modules/workspace/routing';

const logoutActionImpl = createNavAction(async () => {
  const session = await getUserSession();
  const requestContext = getRequestContext();

  await logoutWorkflow({
    sessionId: session?.sessionId,
  });

  await clearAuthCookie();
  await clearVerificationSession();
  await clearUserSession();

  if (requestContext.workspace?.workspaceId) {
    redirect(
      buildWorkspaceLoginPath({
        workspaceId: requestContext.workspace.workspaceId,
        intent: requestContext.workspace.strategy === 'free_path' ? 'free' : 'paid',
        strategy: requestContext.workspace.strategy,
        slug: requestContext.workspace.slug,
      }),
    );
  }

  redirect('/login');
});

export async function logoutAction() {
  return logoutActionImpl();
}
