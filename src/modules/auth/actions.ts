'use server';

import { emailSchema, loginSchema, otpSchema, signupSchema } from './schema';
import { signupWorkflow, loginWorkflow } from './workflows';
import { createNavAction } from '@/lib/http/create-nav-action';
import {
  type AuthCookies,
  setAuthCookies,
  setVerificationSession,
} from '@/lib/auth/auth-cookies';
import { sendOtp } from './services/otp.services';
import { redirect } from 'next/navigation';
import { getActor } from '@/lib/context/actor-context';

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

  try {
    await sendOtp({
      identifier: parsed.email,
      otp: result.otp,
      name: result.name,
      brand: 'SkillMaxx',
    });
  } catch (e) {
    console.error('Failed to send OTP:', e);
    // We can choose to proceed without blocking the user, but log the error for investigation
  }

  await setVerificationSession({
    verificationId: result.verificationId,
    authAccountId: result.authAccountId,
    otpPurpose: 'SIGNUP',
    mode: 'email',
    step: 'email',
    identityId: result.identityId,
    createdAt: Date.now(),
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

  try {
    await sendOtp({
      identifier: parsed.identifier,
      otp: result.otp,
      name: result.name,
      brand: 'SkillMaxx',
    });
  } catch (e) {
    console.error('Failed to send OTP:', e);
  }

  await setVerificationSession({
    verificationId: result.verificationId,
    authAccountId: result.authAccountId,
    otpPurpose: 'LOGIN',
    mode: 'email',
    step: 'email',
    identityId: result.identityId,
    createdAt: Date.now(),
  });

  redirect(`/verify-otp?mode=${result.mode}`);
});

export async function googleAuthAction() {
  // This is a placeholder for the actual Google OAuth flow.
  // In a real implementation, you would redirect the user to Google's OAuth page
  // and handle the callback to authenticate the user.
  return {};
}

export async function verifyAction(formData: FormData) {
  return {};
}

export async function resendAction() {
  return {};
}
