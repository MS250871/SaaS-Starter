'use server';

import { emailSchema, loginSchema, otpSchema, signupSchema } from './schema';
import { signupWorkflow, loginWorkflow } from './workflows';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { AuthCookies, verificationSessionSchema } from '@/lib/auth/auth.schema';
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
  const parsed = signupSchema.parse(raw);
  const actor = getActor();
  let workspaceId: AuthCookies['workspaceId'] = null;
  let entry: AuthCookies['entry'];

  if (parsed.inviteToken) {
    workspaceId = null;
    entry = 'invite';
  } else if (actor.workspaceId) {
    workspaceId = actor.workspaceId;
    entry = 'workspace';
  } else {
    workspaceId = null;
    entry = 'platform';
  }

  const cookiesData: AuthCookies = {
    flow: 'signup',
    intent: parsed.intent,
    entry,
    workspaceId,
    inviteToken: parsed.inviteToken,
    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  const result = await signupWorkflow(parsed);

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
  const parsed = loginSchema.parse(raw);
  const actor = getActor();

  let workspaceId: AuthCookies['workspaceId'] = null;
  let entry: AuthCookies['entry'];

  if (actor.workspaceId) {
    workspaceId = actor.workspaceId;
    entry = 'workspace';
  } else {
    workspaceId = null;
    entry = 'platform';
  }

  const cookiesData: AuthCookies = {
    flow: 'login',
    intent: parsed.intent,
    entry,
    workspaceId,
    createdAt: Date.now(),
  };

  await setAuthCookies({ data: cookiesData });

  const result = await loginWorkflow(parsed);

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
