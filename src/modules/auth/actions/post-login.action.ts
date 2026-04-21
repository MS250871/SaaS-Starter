'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearAuthCookie,
  getAuthCookie,
  getVerificationSession,
  getUserSession,
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { postLoginWorkflow } from '@/modules/auth/workflows/post-login.workflow';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';

const postLoginActionImpl = createNavAction(async () => {
  const identitySession = await getUserSession();
  const auth = await getAuthCookie();

  if (!identitySession?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Session missing');
  }

  if (!auth) {
    throwError(ERR.INVALID_STATE, 'Auth flow missing');
  }

  const activeVerification = await getVerificationSession();

  if (
    activeVerification?.mode === 'phone' &&
    activeVerification.identityId === identitySession.identityId
  ) {
    redirect('/verify-phone');
  }

  const result = await postLoginWorkflow({
    identitySession,
    auth,
  });

  if ('redirectTo' in result && !('finalSession' in result)) {
    if (result.meta?.verificationSession) {
      await setVerificationSession(result.meta.verificationSession);
      await setAuthCookies({
        data: {
          ...auth,
          createdAt: Date.now(),
        },
      });
    }

    if (result.meta?.outboxEventId) {
      await processOtpOutboxEvent(result.meta.outboxEventId);
    }

    redirect(result.redirectTo);
  }

  if ('finalSession' in result && result.finalSession) {
    await setUserSession(result.finalSession);
    await clearAuthCookie();

    redirect(result.redirectTo ?? '/dashboard');
  }

  throwError(ERR.INTERNAL_ERROR, 'Invalid post-login state');
});

export async function postLoginAction() {
  return postLoginActionImpl();
}
