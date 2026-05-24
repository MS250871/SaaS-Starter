'use server';

import {
  loginActionSchema,
  type LoginActionInput,
  loginSchema,
  type LoginDomain,
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
import { loginWorkflow } from '@/modules/auth/workflows/login.workflow';
import { dispatchOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { buildWorkspaceSurfacePath } from '@/modules/workspace/routing';
import {
  buildNavErrorAudit,
  getNavAuditState,
  setNavAuditState,
} from '@/modules/auth/auth-nav-audit';
import { assertLoginRateLimit } from '@/modules/auth/auth-rate-limit';

const loginActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());

  const parsed: LoginActionInput = loginActionSchema.parse(raw);
  const domain: LoginDomain = loginSchema.parse(parsed);

  await assertLoginRateLimit(domain.identifier);

  const actor = getActor();
  const requestContext = getRequestContext();

  let workspaceId: AuthCookies['workspaceId'] = null;

  const entry: AuthCookies['entry'] =
    requestContext.workspace?.workspaceId
      ? 'workspace'
      : parsed.entry ?? (actor.workspaceId ? 'workspace' : 'platform');

  const mode: AuthCookies['mode'] = 'normal';

  if (entry === 'workspace') {
    workspaceId = parsed.workspaceId ?? actor.workspaceId ?? null;
  }

  const cookiesData: AuthCookies = {
    flow: 'login',
    entry,
    mode,
    channel: 'web',
    intent: parsed.intent,
    workspaceId,
    returnPath: parsed.returnPath,
    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  const result = await loginWorkflow(domain);

  setNavAuditState({
    category: 'AUTH',
    source: 'AUTH',
    action: 'auth.login.challenge.create',
    entityType: 'VerificationSession',
    entityId: result.verificationId,
    description: 'Login verification challenge created.',
    metadata: {
      entry,
      intent: parsed.intent,
      mode: result.mode,
      otpPurpose: result.otpPurpose,
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
        action: 'auth.login.challenge.create',
        description: 'Login challenge could not be created.',
        error,
        state: state as ReturnType<typeof getNavAuditState>,
      }),
  },
});

export async function loginAction(formData: FormData) {
  return loginActionImpl(formData);
}
