import type { LoginDomain, SignupDomain } from '@/modules/auth/schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  findAuthAccountByIdentifier,
  createAuthAccountForIdentity,
} from '@/modules/auth/services/authAccount.services';
import { validateInviteToken } from '../workspace/services/invite.services';
import { createIdentity } from '@/modules/auth/services/identity.services';
import { generateOtp } from '@/modules/auth/services/otp.services';
import { AuthAccountType, OtpPurpose } from '@/generated/prisma/client';

export async function signupWorkflow(input: SignupDomain) {
  console.log(input);
  /*------------------------VALIDATE INVITE------------------------*/
  if (input.inviteToken) {
    const invite = await validateInviteToken(input.inviteToken);

    // optional email enforcement
    if (invite.email && invite.email !== input.email) {
      throwError(ERR.INVALID_INPUT, 'Email does not match invite');
    }
  }

  /*------------------------CHECK EXISTING USER------------------------*/
  const existingEmail = await findAuthAccountByIdentifier(input.email);

  if (existingEmail) {
    if (existingEmail.isVerified) {
      if (input.inviteToken) {
        /*------------------------GENERATE OTP------------------------*/
        const otpResult = await generateOtp({
          authAccountId: existingEmail.id,
          otpPurpose: OtpPurpose.LOGIN,
        });

        /*------------------------RESPONSE------------------------*/
        return {
          verificationId: otpResult.verificationId,
          authAccountId: existingEmail.id,
          otpPurpose: OtpPurpose.LOGIN,
          otp: otpResult.otp,
          identityId: existingEmail.identityId,
          name: input.firstName
            ? `${input.firstName} ${input.lastName}`
            : existingEmail.identifier, // fallback
          mode: 'email' as const,
          step: 'email' as const,
          createdAt: Date.now(),
        };
      }
      throwError(ERR.ALREADY_EXISTS, 'Email already registered', 409, {
        email: 'Email already registered',
      });
    } else {
      /*------------------------GENERATE OTP------------------------*/
      const otpResult = await generateOtp({
        authAccountId: existingEmail.id,
        otpPurpose: OtpPurpose.SIGNUP,
      });

      /*------------------------RESPONSE------------------------*/
      return {
        verificationId: otpResult.verificationId,
        authAccountId: existingEmail.id,
        otpPurpose: OtpPurpose.SIGNUP,
        otp: otpResult.otp,
        identityId: existingEmail.identityId,
        name: input.firstName
          ? `${input.firstName} ${input.lastName}`
          : existingEmail.identifier, // fallback
        mode: 'email' as const,
        step: 'email' as const,
        createdAt: Date.now(),
      };
    }
  }

  /*------------------------CREATE IDENTITY------------------------*/
  const identity = await createIdentity({
    email: input.email,
    phone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    isActive: true,
  });

  /*------------------------CREATE AUTH ACCOUNTS (EMAIL/PHONE)------------------------*/
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

  /*------------------------GENERATE OTP------------------------*/
  const otpResult = await generateOtp({
    authAccountId: emailAccount.id,
    otpPurpose: OtpPurpose.SIGNUP,
  });

  /*------------------------RESPONSE------------------------*/
  return {
    verificationId: otpResult.verificationId,
    authAccountId: emailAccount.id,
    otpPurpose: OtpPurpose.SIGNUP,
    identityId: identity.id,
    otp: otpResult.otp,
    name: input.firstName
      ? `${input.firstName} ${input.lastName}`
      : existingEmail.identifier, // fallback
    mode: 'email' as const,
    step: 'email' as const,
    createdAt: Date.now(),
  };
}

export async function loginWorkflow(input: LoginDomain) {
  /*------------------------CHECK USER------------------------*/
  const existing = await findAuthAccountByIdentifier(input.identifier);

  if (!existing) {
    throwError(ERR.NOT_FOUND, 'Account not found', 404, {
      identifier: 'Account not found',
    });
  }

  if (!existing.isVerified) {
    throwError(ERR.INVALID_INPUT, 'Account not verified yet');
  }

  /*------------------------GENERATE OTP------------------------*/
  const otpResult = await generateOtp({
    authAccountId: existing.id,
    otpPurpose: OtpPurpose.LOGIN,
  });

  /*------------------------RESPONSE------------------------*/
  return {
    verificationId: otpResult.verificationId,
    authAccountId: existing.id,
    otpPurpose: OtpPurpose.LOGIN,
    identityId: existing.identityId,
    otp: otpResult.otp,
    mode: 'email' as const, // you can extend later for phone
    step: 'email' as const,
    name: existing.identifier, // or fetch identity if needed
    createdAt: Date.now(),
  };
}
