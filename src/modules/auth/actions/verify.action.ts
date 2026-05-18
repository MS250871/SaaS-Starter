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
  getUserSession,
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { otpSchema } from '@/modules/auth/schema';
import { verifyWorkflow } from '@/modules/auth/workflows/verify.workflow';
import { postLoginWorkflow } from '@/modules/auth/workflows/post-login.workflow';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
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

const verifyActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed = otpSchema.parse(raw);

  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    return redirectForExpiredVerification();
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

  if (result.redirectTo === '/post-login') {
    const auth = await getAuthCookie();
    const identitySession = result.sessionPayload ?? currentSession;

    if (!auth || !identitySession?.identityId) {
      redirect(result.redirectTo);
    }

    const postLoginResult = await postLoginWorkflow({
      identitySession,
      auth,
    });

    if ('redirectTo' in postLoginResult && !('finalSession' in postLoginResult)) {
      if (postLoginResult.meta?.verificationSession) {
        await setVerificationSession(postLoginResult.meta.verificationSession);
        await setAuthCookies({
          data: {
            ...auth,
            createdAt: Date.now(),
          },
        });
      }

      if (postLoginResult.meta?.outboxEventId) {
        await processOtpOutboxEvent(postLoginResult.meta.outboxEventId);
      }

      redirect(await resolvePublicRedirectTarget(postLoginResult.redirectTo));
    }

    if ('finalSession' in postLoginResult && postLoginResult.finalSession) {
      await setUserSession(postLoginResult.finalSession);
      await clearAuthCookie();

      redirect(
        await resolvePublicRedirectTarget(
          postLoginResult.redirectTo ?? '/dashboard',
        ),
      );
    }
  }

  redirect(await resolvePublicRedirectTarget(result.redirectTo));
});

export async function verifyAction(formData: FormData) {
  return verifyActionImpl(formData);
}
