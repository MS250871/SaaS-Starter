import type { LoginDomain } from '@/modules/auth/schema';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { emailSchema } from '@/modules/auth/schema';
import { findAuthAccountByIdentifier } from '@/modules/auth/services/authAccount.services';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { generateOtp } from '@/modules/auth/services/otp.services';
import { OtpPurpose } from '@/generated/prisma/enums';
import { queueOtpDelivery } from '@/modules/auth/services/otp-outbox.services';

export type LoginWorkflowResult = {
  verificationId: string;
  authAccountId: string;
  otpPurpose: 'LOGIN';
  otp: string;
  identityId: string;
  name: string;
  mode: 'email' | 'phone';
  step: 'done';
  identifier: string;
  createdAt: number;
  outboxEventId: string;
};

export async function loginWorkflow(
  input: LoginDomain,
): Promise<LoginWorkflowResult> {
  return withUnitOfWork(async () => {
    const isEmail = emailSchema.safeParse(input.identifier).success;

    const existing = await findAuthAccountByIdentifier(input.identifier);

    if (!existing.isVerified) {
      throwError(ERR.NOT_FOUND, 'Account not found');
    }

    const identity = await getIdentityById(existing.identityId);

    const otpResult = await generateOtp({
      authAccountId: existing.id,
      otpPurpose: OtpPurpose.LOGIN,
    });

    const name = identity
      ? `${identity.firstName} ${identity.lastName}`.trim() || existing.value
      : existing.value;

    const outboxEvent = await queueOtpDelivery({
      identifier: existing.value,
      otp: otpResult.otp,
      name,
      brand: 'SkillMaxx',
      verificationId: otpResult.verificationId,
      identityId: existing.identityId,
    });

    return {
      verificationId: otpResult.verificationId,
      authAccountId: existing.id,
      otpPurpose: OtpPurpose.LOGIN,
      mode: isEmail ? 'email' : 'phone',
      step: 'done',
      identityId: existing.identityId,
      identifier: existing.value,
      createdAt: Date.now(),
      otp: otpResult.otp,
      name,
      outboxEventId: outboxEvent.id,
    };
  });
}
