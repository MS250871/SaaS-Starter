'use server';
import { Verify } from 'crypto';
import { emailSchema, loginSchema, otpSchema, signupSchema } from './schema';
import { LoginState, VerifyState } from './types';
import { SignupState } from './types';

export async function googleAuthAction() {
  // This is a placeholder for the actual Google OAuth flow.
  // In a real implementation, you would redirect the user to Google's OAuth page
  // and handle the callback to authenticate the user.
  return {};
}

export async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const values = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return { errors: { identifier: parsed.error.issues[0].message } };
  }

  const identifier = parsed.data.identifier.trim();
  const isEmail = emailSchema.safeParse(identifier).success;

  if (!identifier) return { formError: 'Enter email or phone number' };

  return {};
}

export async function signupAction(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const values = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      errors[i.path[0] as string] = i.message;
    });
    return { errors };
  }

  const name = parsed.data.firstName.trim() + ' ' + parsed.data.lastName.trim();

  return {};
}

export async function verifyAction(_: VerifyState, formData: FormData) {
  // validate otp input
  const parsed = otpSchema.safeParse({ otp: formData.get('otp') });
  if (!parsed.success) return { errors: { otp: 'Enter valid code' } };
  return {};
}

export async function resendAction() {
  return {};
}
