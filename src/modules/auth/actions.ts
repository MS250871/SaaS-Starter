'use server';

import {
  loginActionSchema,
  type LoginActionInput,
  loginSchema,
  type LoginDomain,
  otpSchema,
  signupActionSchema,
  type SignupActionInput,
  signupSchema,
  type SignupDomain,
} from './schema';
import { signupWorkflow, loginWorkflow, postLoginWorkflow } from './workflows';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  setAuthCookies,
  setVerificationSession,
  setUserSession,
  getUserSession,
  getAuthCookie,
  clearAuthCookie,
} from '@/lib/auth/auth-cookies';
import { AuthCookies } from '@/lib/auth/auth.schema';
import { verifyWorkflow } from './workflows';
import {
  getVerificationSession,
  clearVerificationSession,
} from '@/lib/auth/auth-cookies';
import { sendOtp } from './services/otp.services';
import { redirect } from 'next/navigation';
import { getActor } from '@/lib/context/actor-context';
import { ERR } from '@/lib/errors/codes';
import { throwError } from '@/lib/errors/app-error';
import { resendOtpWorkflow } from './workflows';

export const signupAction = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());

  /* =========================================================
     PARSE & VALIDATE INPUT
  ========================================================= */

  const parsed: SignupActionInput = signupActionSchema.parse(raw);

  const domain: SignupDomain = signupSchema.parse(parsed);

  const actor = getActor();

  /* =========================================================
     DERIVE FLOW STATE
  ========================================================= */

  let workspaceId: AuthCookies['workspaceId'] = null;

  // ✅ entry always domain
  let entry: AuthCookies['entry'] =
    parsed.entry ?? (actor.workspaceId ? 'workspace' : 'platform');

  // ✅ mode derived from invite
  let mode: AuthCookies['mode'] = parsed.inviteToken ? 'invite' : 'normal';

  // ✅ workspaceId only for normal workspace flow
  if (entry === 'workspace' && mode === 'normal') {
    workspaceId = actor.workspaceId ?? null;
  }

  /* =========================================================
     COOKIES
  ========================================================= */

  const cookiesData: AuthCookies = {
    flow: 'signup',

    entry,
    mode,
    channel: 'web',

    intent: parsed.intent,

    workspaceId,
    inviteToken: parsed.inviteToken,

    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  /* =========================================================
     WORKFLOW
  ========================================================= */

  const result = await signupWorkflow(domain);

  /* =========================================================
     OTP
  ========================================================= */

  await sendOtp({
    identifier: result.identifier,
    otp: result.otp,
    name: result.name,
    brand: 'SkillMaxx',
  });

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

  redirect(`/verify-otp?mode=${result.mode}`);
});

export const loginAction = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());

  /* =========================================================
     PARSE
  ========================================================= */

  const parsed: LoginActionInput = loginActionSchema.parse(raw);

  const domain: LoginDomain = loginSchema.parse(parsed);

  const actor = getActor();

  /* =========================================================
     DERIVE FLOW STATE
  ========================================================= */

  let workspaceId: AuthCookies['workspaceId'] = null;

  // ✅ entry: prefer parsed → fallback to actor
  let entry: AuthCookies['entry'] =
    parsed.entry ?? (actor.workspaceId ? 'workspace' : 'platform');

  // ✅ login is always normal mode
  const mode: AuthCookies['mode'] = 'normal';

  // ✅ workspace context only if available
  if (entry === 'workspace') {
    workspaceId = actor.workspaceId ?? null;
  }

  /* =========================================================
     COOKIES
  ========================================================= */

  const cookiesData: AuthCookies = {
    flow: 'login',

    entry,
    mode,
    channel: 'web',

    intent: parsed.intent,

    workspaceId,

    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  /* =========================================================
     WORKFLOW
  ========================================================= */

  const result = await loginWorkflow(domain);

  /* =========================================================
     OTP
  ========================================================= */

  await sendOtp({
    identifier: result.identifier,
    otp: result.otp,
    name: result.name,
    brand: 'SkillMaxx',
  });

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

  redirect(`/verify-otp?mode=${result.mode}`);
});

export async function googleAuthAction() {
  // This is a placeholder for the actual Google OAuth flow.
  // In a real implementation, you would redirect the user to Google's OAuth page
  // and handle the callback to authenticate the user.
  return {};
}

export const verifyAction = createNavAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed = otpSchema.parse(raw);

  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    throwError(ERR.INVALID_STATE, 'Verification session missing');
  }

  const result = await verifyWorkflow({
    otp: parsed.otp,
    verificationSession,
  });

  await clearVerificationSession();

  await setUserSession(result);

  redirect('/post-login');
});

export const resendAction = createNavAction(async () => {
  const verificationSession = await getVerificationSession();

  if (!verificationSession?.verificationId) {
    throwError(ERR.INVALID_STATE, 'Verification session missing');
  }

  const result = await resendOtpWorkflow({
    verificationSession,
  });

  await sendOtp({
    identifier: result.identifier,
    otp: result.otp,
    name: result.name,
    brand: 'SkillMaxx',
  });
});

// modules/auth/actions.ts

export const postLoginAction = createNavAction(async () => {
  /* =========================================================
     LOAD STATE
  ========================================================= */

  const identitySession = await getUserSession();
  const auth = await getAuthCookie();

  if (!identitySession?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Session missing');
  }

  if (!auth) {
    throwError(ERR.INVALID_STATE, 'Auth flow missing');
  }

  /* =========================================================
     WORKFLOW
  ========================================================= */

  const result = await postLoginWorkflow({
    identitySession,
    auth,
  });

    redirect(result.redirectTo);
  }

  /* =========================================================
     FINAL SESSION
  ========================================================= */

  if ('finalSession' in result && result.finalSession) {
    await setUserSession(result.finalSession);

    // clear flow state
    await clearAuthCookie();

    redirect(result.redirectTo ?? '/dashboard');
  }

  /* =========================================================
     FALLBACK
  ========================================================= */

  throwError(ERR.INTERNAL_ERROR, 'Invalid post-login state');
});
