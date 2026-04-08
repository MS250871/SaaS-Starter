import type { LoginDomain, SignupDomain } from '@/modules/auth/schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  findAuthAccountByIdentifier,
  createAuthAccountForIdentity,
} from '@/modules/auth/services/authAccount.services';
import { validateInviteToken } from '../workspace/services/invite.services';
import {
  createIdentity,
  getIdentityById,
} from '@/modules/auth/services/identity.services';
import {
  generateOtp,
  getOtpRequestByVerificationId,
  resendOtp,
} from '@/modules/auth/services/otp.services';
import { verifyOtp } from '@/modules/auth/services/otp.services';
import { verifyAuthAccount } from '@/modules/auth/services/authAccount.services';
import { createSession } from '@/modules/auth/services/session.services';
import { AuthAccountType, OtpPurpose } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { emailSchema } from '@/modules/auth/schema';
import { SessionPayload, VerificationSession } from '@/lib/auth/auth.schema';
import { getRequestContext } from '@/lib/context/request-context';
import { createFingerprint } from '@/lib/auth/auth-utils';
import { get } from 'http';

export async function signupWorkflow(input: SignupDomain) {
  return withUnitOfWork(async () => {
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

    const OtpPurposeToUse = input.inviteToken
      ? OtpPurpose.INVITE
      : OtpPurpose.SIGNUP;

    if (existingEmail) {
      if (existingEmail.isVerified) {
        if (input.inviteToken) {
          /*------------------------GENERATE OTP------------------------*/
          const otpResult = await generateOtp({
            authAccountId: existingEmail.id,
            otpPurpose: OtpPurpose.INVITE,
          });

          /*------------------------RESPONSE------------------------*/
          return {
            verificationId: otpResult.verificationId,
            authAccountId: existingEmail.id,
            otpPurpose: OtpPurpose.INVITE,
            otp: otpResult.otp,
            identityId: existingEmail.identityId,
            name: input.firstName
              ? `${input.firstName} ${input.lastName}`
              : existingEmail.value, // fallback
            mode: 'email' as const,
            step: 'email' as const,
            identifier: existingEmail.value,
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
          otpPurpose: OtpPurposeToUse,
        });

        /*------------------------RESPONSE------------------------*/
        return {
          verificationId: otpResult.verificationId,
          authAccountId: existingEmail.id,
          otpPurpose: OtpPurposeToUse,
          otp: otpResult.otp,
          identityId: existingEmail.identityId,
          name: input.firstName
            ? `${input.firstName} ${input.lastName}`
            : existingEmail.value, // fallback
          mode: 'email' as const,
          step: 'email' as const,
          identifier: existingEmail.value,
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
      otpPurpose: OtpPurposeToUse,
    });

    /*------------------------RESPONSE------------------------*/
    return {
      verificationId: otpResult.verificationId,
      authAccountId: emailAccount.id,
      otpPurpose: OtpPurposeToUse,
      mode: 'email' as const,
      step: 'email' as const,
      identityId: identity.id,
      identifier: input.email,
      createdAt: Date.now(),
      otp: otpResult.otp,
      name: input.firstName
        ? `${input.firstName} ${input.lastName}`
        : input.email,
    };
  });
}

export async function loginWorkflow(input: LoginDomain) {
  const isEmail = emailSchema.safeParse(input.identifier).success;
  /*------------------------CHECK USER------------------------*/
  const existing = await findAuthAccountByIdentifier(input.identifier);

  if (!existing.isVerified) {
    throwError(ERR.INVALID_INPUT, 'Account not verified yet');
  }

  const identity = await getIdentityById(existing.identityId);

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
    mode: isEmail ? ('email' as const) : ('phone' as const),
    step: 'done' as const,
    identityId: existing.identityId,
    identifier: existing.value,
    createdAt: Date.now(),
    otp: otpResult.otp,
    name: identity
      ? `${identity.firstName} ${identity.lastName}`
      : existing.value,
  };
}

export async function verifyWorkflow(input: {
  otp: string;
  verificationSession: VerificationSession;
}) {
  return withUnitOfWork(async () => {
    const { otp, verificationSession } = input;

    const reqContext = getRequestContext();
    const deviceFingerprint = createFingerprint(reqContext);

    /* ---------------- VERIFY OTP ---------------- */
    await verifyOtp({
      verificationId: verificationSession.verificationId,
      otp,
    });

    /* ---------------- MARK ACCOUNT VERIFIED ---------------- */
    if (
      verificationSession.otpPurpose === OtpPurpose.SIGNUP ||
      verificationSession.otpPurpose === OtpPurpose.INVITE
    ) {
      await verifyAuthAccount(verificationSession.authAccountId);
    }

    /* ---------------- CREATE SESSION ---------------- */
    const identitySession = {
      identityId: verificationSession.identityId,
      ip: reqContext.ip,
      browser: reqContext.browser,
      os: reqContext.os,
      device: reqContext.device,
      deviceId: reqContext.deviceId,
      deviceFingerprint: deviceFingerprint,
      userAgent: reqContext.userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 mins, can be adjusted
    };

    const session = await createSession(identitySession);

    /* ---------------- BUILD SESSION COOKIE PAYLOAD ---------------- */
    const payload: SessionPayload = {
      sessionId: session.id,
      identityId: session.identityId,

      workspaceId: session.workspaceId ?? undefined,
      membershipId: session.membershipId ?? undefined,

      platformRole: session.platformRole ?? undefined,
      workspaceRole: session.workspaceRole ?? undefined,

      ip: session.ip ?? undefined,
      browser: session.browser ?? undefined,
      os: session.os ?? undefined,
      device: session.device ?? undefined,
      deviceId: session.deviceId ?? undefined,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
      userAgent: session.userAgent ?? undefined,

      isActive: session.isActive,

      permissions: [], // ✅ EMPTY for identity session
      features: [],
      limits: {},

      createdAt: session.createdAt.getTime(),
      expiresAt: session.expiresAt.getTime(),
    };

    /* ---------------- RETURN ---------------- */
    return payload;
  });
}

export async function resendOtpWorkflow(input: {
  verificationSession: VerificationSession;
}) {
  return withUnitOfWork(async () => {
    const { verificationSession } = input;

    const identity = await getIdentityById(verificationSession.identityId);

    const result = await resendOtp({
      verificationId: verificationSession.verificationId,
    });

    /* ---------------- RETURN ---------------- */
    return {
      otp: result.otp,
      identifier: verificationSession.identifier,
      name: identity
        ? `${identity.firstName} ${identity.lastName}`
        : verificationSession.identifier,
    };
  });
}
