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
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { resendOtpWorkflow } from '@/modules/auth/workflows/resend.workflow';
import {
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
} from '@/modules/workspace/routing';

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

  const result = await resendOtpWorkflow({
    verificationSession,
  });

  await processOtpOutboxEvent(result.outboxEventId);
});

export async function resendAction() {
  return resendActionImpl();
}
