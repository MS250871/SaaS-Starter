'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearAuthCookie,
  clearVerificationSession,
  getAuthCookie,
  getVerificationSession,
} from '@/lib/auth/auth-cookies';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { resendOtpWorkflow } from '@/modules/auth/workflows/resend.workflow';

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

const resendActionImpl = createNavAction(async () => {
  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    return redirectForExpiredVerification();
  }

  const result = await resendOtpWorkflow({
    verificationSession,
  });

  await processOtpOutboxEvent(result.outboxEventId);
});

export async function resendAction() {
  return resendActionImpl();
}
