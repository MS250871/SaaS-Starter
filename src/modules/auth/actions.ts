'use server';

import { postLoginWorkflow } from './workflows';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearAuthCookie,
  getAuthCookie,
  getUserSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { redirect } from 'next/navigation';
import { ERR } from '@/lib/errors/codes';
import { throwError } from '@/lib/errors/app-error';

export { signupAction } from './actions/signup.action';
export { loginAction } from './actions/login.action';
export { verifyAction } from './actions/verify.action';
export { resendAction } from './actions/resend.action';

export async function googleAuthAction() {
  return {};
}

export const postLoginAction = createNavAction(async () => {
  const identitySession = await getUserSession();
  const auth = await getAuthCookie();

  if (!identitySession?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Session missing');
  }

  if (!auth) {
    throwError(ERR.INVALID_STATE, 'Auth flow missing');
  }

  const result = await postLoginWorkflow({
    identitySession,
    auth,
  });

  if ('redirectTo' in result && !('finalSession' in result)) {
    redirect(result.redirectTo);
  }

  if ('finalSession' in result && result.finalSession) {
    await setUserSession(result.finalSession);
    await clearAuthCookie();

    redirect(result.redirectTo ?? '/dashboard');
  }

  throwError(ERR.INTERNAL_ERROR, 'Invalid post-login state');
});
