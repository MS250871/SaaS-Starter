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
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { buildWorkspaceSurfacePath } from '@/modules/workspace/routing';

const loginActionImpl = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());

  const parsed: LoginActionInput = loginActionSchema.parse(raw);
  const domain: LoginDomain = loginSchema.parse(parsed);

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

  await processOtpOutboxEvent(result.outboxEventId);

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
});

export async function loginAction(formData: FormData) {
  return loginActionImpl(formData);
}
