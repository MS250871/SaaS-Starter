'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearAuthCookie,
  clearVerificationSession,
  getAuthCookie,
  getVerificationSession,
  getUserSession,
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { otpSchema } from '@/modules/auth/schema';
import { verifyWorkflow } from '@/modules/auth/workflows/verify.workflow';
import { postLoginWorkflow } from '@/modules/auth/workflows/post-login.workflow';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';

async function redirectForExpiredVerification(): Promise<never> {
  const auth = await getAuthCookie();

  await clearVerificationSession();

  if (!auth) {
    redirect('/login?expired=verification');
  }

  const params = new URLSearchParams();

  if (auth.intent) {
    params.set('intent', auth.intent);
  }

  params.set('expired', 'verification');

  if (auth.flow === 'signup') {
    params.set('entry', auth.entry);

    if (auth.mode === 'invite' && auth.inviteToken) {
      params.set('invite', auth.inviteToken);
    }

    if (auth.planKey) {
      params.set('plan', auth.planKey);
    }

    if (auth.planName) {
      params.set('planName', auth.planName);
    }

    redirect(`/signup?${params.toString()}`);
  }

  await clearAuthCookie();
  redirect(`/login?${params.toString()}`);
}

const verifyActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed = otpSchema.parse(raw);

  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    return redirectForExpiredVerification();
  }

  const currentSession = await getUserSession();

  const result = await verifyWorkflow({
    otp: parsed.otp,
    verificationSession,
    currentSession,
  });

  await clearVerificationSession();
  if (result.sessionPayload) {
    await setUserSession(result.sessionPayload);
  }

  if (result.redirectTo === '/post-login') {
    const auth = await getAuthCookie();
    const identitySession = result.sessionPayload ?? currentSession;

    if (!auth || !identitySession?.identityId) {
      redirect(result.redirectTo);
    }

    const postLoginResult = await postLoginWorkflow({
      identitySession,
      auth,
    });

    if ('redirectTo' in postLoginResult && !('finalSession' in postLoginResult)) {
      if (postLoginResult.meta?.verificationSession) {
        await setVerificationSession(postLoginResult.meta.verificationSession);
        await setAuthCookies({
          data: {
            ...auth,
            createdAt: Date.now(),
          },
        });
      }

      if (postLoginResult.meta?.outboxEventId) {
        await processOtpOutboxEvent(postLoginResult.meta.outboxEventId);
      }

      redirect(postLoginResult.redirectTo);
    }

    if ('finalSession' in postLoginResult && postLoginResult.finalSession) {
      await setUserSession(postLoginResult.finalSession);
      await clearAuthCookie();

      redirect(postLoginResult.redirectTo ?? '/dashboard');
    }
  }

  redirect(result.redirectTo);
});

export async function verifyAction(formData: FormData) {
  return verifyActionImpl(formData);
}
