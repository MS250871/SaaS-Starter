'use server';

import {
  signupActionSchema,
  type SignupActionInput,
  signupSchema,
  type SignupDomain,
} from '@/modules/auth/schema';
import { createNavAction } from '@/lib/http/create-nav-action';
import { getActor } from '@/lib/context/actor-context';
import { getRequestContext } from '@/lib/context/request-context';
import { resolvePublicRedirectTarget } from '@/lib/http/resolve-public-redirect';
import {
  setAuthCookies,
  setVerificationSession,
} from '@/lib/auth/auth-cookies';
import type { AuthCookies } from '@/lib/auth/auth.schema';
import { redirect } from 'next/navigation';
import { signupWorkflow } from '@/modules/auth/workflows/signup.workflow';
import { dispatchOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { buildWorkspaceSurfacePath } from '@/modules/workspace/routing';
import {
  buildNavErrorAudit,
  getNavAuditState,
  setNavAuditState,
} from '@/modules/auth/auth-nav-audit';
import { assertSignupRateLimit } from '@/modules/auth/auth-rate-limit';

const signupActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: SignupActionInput = signupActionSchema.parse(raw);
  const domain: SignupDomain = signupSchema.parse(parsed);

  await assertSignupRateLimit(domain.email);

  const actor = getActor();
  const requestContext = getRequestContext();

  let workspaceId: AuthCookies['workspaceId'] = null;

  const entry: AuthCookies['entry'] =
    requestContext.workspace?.workspaceId && !parsed.inviteToken
      ? 'workspace'
      : parsed.entry ?? (actor.workspaceId ? 'workspace' : 'platform');

  const mode: AuthCookies['mode'] = parsed.inviteToken ? 'invite' : 'normal';

  if (entry === 'workspace' && mode === 'normal') {
    workspaceId = parsed.workspaceId ?? actor.workspaceId ?? null;
  }

  const cookiesData: AuthCookies = {
    flow: 'signup',
    entry,
    mode,
    channel: 'web',
    intent: parsed.intent,
    planKey: parsed.planKey,
    planName: parsed.planName,
    workspaceId,
    inviteToken: parsed.inviteToken,
    returnPath: parsed.returnPath,
    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  const result = await signupWorkflow(domain);

  setNavAuditState({
    category: 'AUTH',
    source: 'AUTH',
    action: 'auth.signup.challenge.create',
    entityType: 'VerificationSession',
    entityId: result.verificationId,
    description: 'Signup verification challenge created.',
    metadata: {
      entry,
      intent: parsed.intent,
      invite: Boolean(parsed.inviteToken),
      mode: result.mode,
      otpPurpose: result.otpPurpose,
      planKey: parsed.planKey ?? null,
      workspaceId,
    },
  });

  await dispatchOtpOutboxEvent(result.outboxEventId);

  await setVerificationSession({
    verificationId: result.verificationId,
    authAccountId: result.authAccountId,
    otpPurpose: result.otpPurpose,
    mode: result.mode,
    step: result.step,
    identityId: result.identityId,
    identifier: result.identifier,
    createdAt: result.createdAt,
  });

  const verifyPath = buildWorkspaceSurfacePath({
    strategy: requestContext.workspace?.strategy,
    slug: requestContext.workspace?.slug,
    path: '/verify-otp',
  });

  redirect(await resolvePublicRedirectTarget(`${verifyPath}?mode=${result.mode}`));
}, {
  audit: {
    onSuccess: () => getNavAuditState(),
    onError: ({ error, state }) =>
      buildNavErrorAudit({
        action: 'auth.signup.challenge.create',
        description: 'Signup challenge could not be created.',
        error,
        state: state as ReturnType<typeof getNavAuditState>,
      }),
  },
});

export async function signupAction(formData: FormData) {
  return signupActionImpl(formData);
}
