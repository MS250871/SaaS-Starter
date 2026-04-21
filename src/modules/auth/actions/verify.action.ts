'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearVerificationSession,
  getVerificationSession,
  getUserSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { otpSchema } from '@/modules/auth/schema';
import { verifyWorkflow } from '@/modules/auth/workflows/verify.workflow';

const verifyActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed = otpSchema.parse(raw);

  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    throwError(ERR.INVALID_STATE, 'Verification session missing');
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

  redirect(result.redirectTo);
});

export async function verifyAction(formData: FormData) {
  return verifyActionImpl(formData);
}
