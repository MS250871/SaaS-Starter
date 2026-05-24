'use server';

import { redirect } from 'next/navigation';
import { createNavAction } from '@/lib/http/create-nav-action';
import { getRequestContext } from '@/lib/context/request-context';
import { resolvePublicRedirectTarget } from '@/lib/http/resolve-public-redirect';
import {
  clearAuthCookie,
  clearVerificationSession,
  getAuthCookie,
  getVerificationSession,
} from '@/lib/auth/auth-cookies';
import { dispatchOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { resendOtpWorkflow } from '@/modules/auth/workflows/resend.workflow';
import {
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
} from '@/modules/workspace/routing';
import {
  buildNavErrorAudit,
  getNavAuditState,
  setNavAuditState,
} from '@/modules/auth/auth-nav-audit';
import { assertOtpResendRateLimit } from '@/modules/auth/auth-rate-limit';

async function redirectForExpiredVerification(): Promise<never> {
  const auth = await getAuthCookie();
  const requestContext = getRequestContext();

  await clearVerificationSession();

  if (!auth) {
    if (requestContext.workspace?.workspaceId) {
      redirect(
        await resolvePublicRedirectTarget(
          `${buildWorkspaceLoginPath({
            workspaceId: requestContext.workspace.workspaceId,
            intent:
              requestContext.workspace.strategy === 'free_path'
                ? 'free'
                : 'paid',
            strategy: requestContext.workspace.strategy,
            slug: requestContext.workspace.slug,
          })}&expired=verification`,
        ),
      );
    }

    redirect(await resolvePublicRedirectTarget('/login?expired=verification'));
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

    if (auth.entry === 'workspace' && auth.workspaceId) {
      redirect(
        await resolvePublicRedirectTarget(
          `${buildWorkspaceSignupPath({
            workspaceId: auth.workspaceId,
            intent: auth.intent,
            strategy: requestContext.workspace?.strategy,
            slug: requestContext.workspace?.slug,
          })}&${params.toString()}`,
        ),
      );
    }

    redirect(await resolvePublicRedirectTarget(`/signup?${params.toString()}`));
  }

  await clearAuthCookie();

  if (auth.entry === 'workspace' && auth.workspaceId) {
    redirect(
      await resolvePublicRedirectTarget(
        `${buildWorkspaceLoginPath({
          workspaceId: auth.workspaceId,
          intent: auth.intent,
          strategy: requestContext.workspace?.strategy,
          slug: requestContext.workspace?.slug,
        })}&${params.toString()}`,
      ),
    );
  }

  redirect(await resolvePublicRedirectTarget(`/login?${params.toString()}`));
}

const resendActionImpl = createNavAction(async () => {
  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    return redirectForExpiredVerification();
  }

  await assertOtpResendRateLimit(verificationSession.verificationId);

  const result = await resendOtpWorkflow({
    verificationSession,
  });

  setNavAuditState({
    category: 'AUTH',
    source: 'AUTH',
    action: 'auth.otp.resend',
    entityType: 'VerificationSession',
    entityId: verificationSession.verificationId,
    description: 'Verification OTP resent.',
    metadata: {
      mode: verificationSession.mode,
      otpPurpose: verificationSession.otpPurpose,
      step: verificationSession.step,
    },
  });

  await dispatchOtpOutboxEvent(result.outboxEventId);
}, {
  audit: {
    onSuccess: () => getNavAuditState(),
    onError: ({ error, state }) =>
      buildNavErrorAudit({
        action: 'auth.otp.resend',
        description: 'Verification OTP could not be resent.',
        error,
        state: state as ReturnType<typeof getNavAuditState>,
        entityType: 'VerificationSession',
      }),
  },
});

export async function resendAction() {
  return resendActionImpl();
}
