'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearAuthCookie,
  clearUserSession,
  clearVerificationSession,
  getUserSession,
} from '@/lib/auth/auth-cookies';
import { logoutWorkflow } from '@/modules/auth/workflows/logout.workflow';

const logoutActionImpl = createNavAction(async () => {
  const session = await getUserSession();

  await logoutWorkflow({
    sessionId: session?.sessionId,
  });

  await clearAuthCookie();
  await clearVerificationSession();
  await clearUserSession();

  redirect('/login');
});

export async function logoutAction() {
  return logoutActionImpl();
}
