'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  clearVerificationSession,
  getVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { otpSchema } from '@/modules/auth/schema';
import { verifyWorkflow } from '@/modules/auth/workflows/verify.workflow';

export const verifyAction = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed = otpSchema.parse(raw);

  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    throwError(ERR.INVALID_STATE, 'Verification session missing');
  }

  const result = await verifyWorkflow({
    otp: parsed.otp,
    verificationSession,
  });

  await clearVerificationSession();
  await setUserSession(result);

  redirect('/post-login');
});
