'use server';

import { createNavAction } from '@/lib/http/create-nav-action';
import { getVerificationSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { resendOtpWorkflow } from '@/modules/auth/workflows/resend.workflow';

const resendActionImpl = createNavAction(async () => {
  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    throwError(ERR.INVALID_STATE, 'Verification session missing');
  }

  const result = await resendOtpWorkflow({
    verificationSession,
  });

  await processOtpOutboxEvent(result.outboxEventId);
});

export async function resendAction() {
  return resendActionImpl();
}
