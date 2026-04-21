import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type { VerificationSession } from '@/lib/auth/auth.schema';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { resendOtp } from '@/modules/auth/services/otp.services';
import { queueOtpDelivery } from '@/modules/auth/services/otp-outbox.services';

export type ResendOtpWorkflowInput = {
  verificationSession: VerificationSession;
};

export type ResendOtpWorkflowResult = {
  outboxEventId: string;
};

export async function resendOtpWorkflow(
  input: ResendOtpWorkflowInput,
): Promise<ResendOtpWorkflowResult> {
  return withUnitOfWork(async () => {
    const { verificationSession } = input;

    const sessionTtlMs = 15 * 60 * 1000;

    if (Date.now() - verificationSession.createdAt > sessionTtlMs) {
      throwError(ERR.TOKEN_EXPIRED, 'Verification session expired');
    }

    const identity = await getIdentityById(verificationSession.identityId);

    const result = await resendOtp({
      verificationId: verificationSession.verificationId,
    });

    const name = identity
      ? `${identity.firstName} ${identity.lastName}`.trim() ||
        verificationSession.identifier
      : verificationSession.identifier;

    const outboxEvent = await queueOtpDelivery({
      identifier: verificationSession.identifier,
      otp: result.otp,
      name,
      brand: 'SkillMaxx',
      verificationId: result.verificationId,
      identityId: verificationSession.identityId,
    });

    return {
      outboxEventId: outboxEvent.id,
    };
  });
}
