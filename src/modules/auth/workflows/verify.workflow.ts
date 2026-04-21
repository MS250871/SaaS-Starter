import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getRequestContext } from '@/lib/context/request-context';
import { createFingerprint } from '@/lib/auth/auth-utils';
import type {
  SessionPayload,
  VerificationSession,
} from '@/lib/auth/auth.schema';
import { OtpPurpose } from '@/generated/prisma/enums';
import { verifyAuthAccount } from '@/modules/auth/services/authAccount.services';
import { verifyOtp } from '@/modules/auth/services/otp.services';
import { createSession } from '@/modules/auth/services/session.services';

export type VerifyWorkflowInput = {
  otp: string;
  verificationSession: VerificationSession;
};

export async function verifyWorkflow(
  input: VerifyWorkflowInput,
): Promise<SessionPayload> {
  return withUnitOfWork(async () => {
    const { otp, verificationSession } = input;

    const reqContext = getRequestContext();
    const deviceFingerprint = createFingerprint(reqContext);

    await verifyOtp({
      verificationId: verificationSession.verificationId,
      otp,
    });

    if (
      verificationSession.otpPurpose === OtpPurpose.SIGNUP ||
      verificationSession.otpPurpose === OtpPurpose.INVITE
    ) {
      await verifyAuthAccount(verificationSession.authAccountId);
    }

    const identitySession = {
      identityId: verificationSession.identityId,
      ip: reqContext.ip,
      browser: reqContext.browser,
      os: reqContext.os,
      device: reqContext.device,
      deviceId: reqContext.deviceId,
      deviceFingerprint,
      userAgent: reqContext.userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    };

    const session = await createSession(identitySession);

    return {
      sessionId: session.id,
      identityId: session.identityId,
      workspaceId: session.workspaceId ?? undefined,
      membershipId: session.membershipId ?? undefined,
      platformRoles: [],
      workspaceRole: session.workspaceRole ?? undefined,
      ip: session.ip ?? undefined,
      browser: session.browser ?? undefined,
      os: session.os ?? undefined,
      device: session.device ?? undefined,
      deviceId: session.deviceId ?? undefined,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
      userAgent: session.userAgent ?? undefined,
      isActive: session.isActive,
      permissions: [],
      features: [],
      limits: {},
      createdAt: session.createdAt.getTime(),
      expiresAt: session.expiresAt.getTime(),
    };
  });
}
