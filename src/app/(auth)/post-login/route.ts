import { NextRequest, NextResponse } from 'next/server';
import {
  clearAuthCookie,
  getAuthCookie,
  getVerificationSession,
  getUserSession,
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { postLoginWorkflow } from '@/modules/auth/workflows/post-login.workflow';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { withRequestContext } from '@/lib/request/withRequestContext';

export async function GET(req: NextRequest) {
  return withRequestContext(req, async () => {
    const identitySession = await getUserSession();
    const auth = await getAuthCookie();

    if (!identitySession?.identityId || !auth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const activeVerification = await getVerificationSession();

    if (
      activeVerification?.mode === 'phone' &&
      activeVerification.identityId === identitySession.identityId
    ) {
      return NextResponse.redirect(new URL('/verify-phone', req.url));
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

      return NextResponse.redirect(new URL(result.redirectTo, req.url));
    }

    if ('finalSession' in result && result.finalSession) {
      await setUserSession(result.finalSession);
      await clearAuthCookie();

      return NextResponse.redirect(
        new URL(result.redirectTo ?? '/dashboard', req.url),
      );
    }

    return NextResponse.redirect(new URL('/login', req.url));
  });
}
