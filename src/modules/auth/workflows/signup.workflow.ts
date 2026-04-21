import type { SignupDomain } from '@/modules/auth/schema';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  findAuthAccountByTypeValue,
  createAuthAccountForIdentity,
} from '@/modules/auth/services/authAccount.services';
import { createIdentity } from '@/modules/auth/services/identity.services';
import { generateOtp } from '@/modules/auth/services/otp.services';
import { AuthAccountType, OtpPurpose } from '@/generated/prisma/enums';
import { validateInviteToken } from '@/modules/workspace/services/invite.services';
import { queueOtpDelivery } from '@/modules/auth/services/otp-outbox.services';

export type SignupWorkflowResult = {
  verificationId: string;
  authAccountId: string;
  otpPurpose: OtpPurpose;
  otp: string;
  identityId: string;
  name: string;
  mode: 'email';
  step: 'email';
  identifier: string;
  createdAt: number;
  outboxEventId: string;
};

function buildSignupResult(params: {
  verificationId: string;
  authAccountId: string;
  otpPurpose: OtpPurpose;
  otp: string;
  identityId: string;
  name: string;
  identifier: string;
  outboxEventId: string;
}): SignupWorkflowResult {
  return {
    verificationId: params.verificationId,
    authAccountId: params.authAccountId,
    otpPurpose: params.otpPurpose,
    otp: params.otp,
    identityId: params.identityId,
    name: params.name,
    mode: 'email',
    step: 'email',
    identifier: params.identifier,
    createdAt: Date.now(),
    outboxEventId: params.outboxEventId,
  };
}

export async function signupWorkflow(input: SignupDomain) {
  return withUnitOfWork(async () => {
    if (input.inviteToken) {
      const invite = await validateInviteToken(input.inviteToken);

      if (invite.email && invite.email !== input.email) {
        throwError(ERR.INVALID_INPUT, 'Email does not match invite');
      }
    }

    const existingEmail = await findAuthAccountByTypeValue(
      AuthAccountType.EMAIL,
      input.email.toLowerCase(),
    );
    const otpPurpose = input.inviteToken ? OtpPurpose.INVITE : OtpPurpose.SIGNUP;

    if (existingEmail) {
      if (existingEmail.isVerified && !input.inviteToken) {
        throwError(ERR.ALREADY_EXISTS, 'Email already registered', 409, {
          email: 'Email already registered',
        });
      }

      const otpResult = await generateOtp({
        authAccountId: existingEmail.id,
        otpPurpose,
      });

      const name =
        input.firstName && input.lastName
          ? `${input.firstName} ${input.lastName}`
          : existingEmail.value;

      const outboxEvent = await queueOtpDelivery({
        identifier: existingEmail.value,
        otp: otpResult.otp,
        name,
        brand: 'SkillMaxx',
        verificationId: otpResult.verificationId,
        identityId: existingEmail.identityId,
      });

      return buildSignupResult({
        verificationId: otpResult.verificationId,
        authAccountId: existingEmail.id,
        otpPurpose,
        otp: otpResult.otp,
        identityId: existingEmail.identityId,
        name,
        identifier: existingEmail.value,
        outboxEventId: outboxEvent.id,
      });
    }

    const identity = await createIdentity({
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: true,
    });

    const emailAccount = await createAuthAccountForIdentity(
      identity.id,
      AuthAccountType.EMAIL,
      input.email,
    );

    await createAuthAccountForIdentity(
      identity.id,
      AuthAccountType.PHONE,
      String(input.phone),
    );

    const otpResult = await generateOtp({
      authAccountId: emailAccount.id,
      otpPurpose,
    });

    const name = input.firstName
      ? `${input.firstName} ${input.lastName}`
      : input.email;

    const outboxEvent = await queueOtpDelivery({
      identifier: input.email,
      otp: otpResult.otp,
      name,
      brand: 'SkillMaxx',
      verificationId: otpResult.verificationId,
      identityId: identity.id,
    });

    return buildSignupResult({
      verificationId: otpResult.verificationId,
      authAccountId: emailAccount.id,
      otpPurpose,
      otp: otpResult.otp,
      identityId: identity.id,
      name,
      identifier: input.email,
      outboxEventId: outboxEvent.id,
    });
  });
}
