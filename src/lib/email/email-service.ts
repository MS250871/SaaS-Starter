import { sendMail } from './transport';
import { otpTemplate } from './templates/otp-template';
import { workspaceInviteTemplate } from './templates/workspace-invite-template';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function sendOtpEmail({
  to,
  otp,
  name,
}: {
  to: string;
  otp: string;
  name?: string;
}) {
  if (!to || !otp) {
    throwError(ERR.INVALID_INPUT, 'Email and OTP are required');
  }

  const hasEmailConfig = Boolean(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM,
  );

  if (process.env.NODE_ENV !== 'production' && !hasEmailConfig) {
    console.info('[DEV OTP EMAIL]', {
      to,
      otp,
      name,
    });
    return;
  }

  const mail = otpTemplate({ otp, name });

  try {
    await sendMail({ to, ...mail });
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to send OTP email',
      undefined,
      e,
    );
  }
}

export async function sendWorkspaceInviteEmail({
  to,
  workspaceName,
  signupUrl,
  role,
  inviterName,
  expiresAt,
}: {
  to: string;
  workspaceName: string;
  signupUrl: string;
  role: string;
  inviterName?: string | null;
  expiresAt?: Date | null;
}) {
  if (!to || !workspaceName || !signupUrl || !role) {
    throwError(ERR.INVALID_INPUT, 'Invite email details are required');
  }

  const mail = workspaceInviteTemplate({
    workspaceName,
    signupUrl,
    role,
    inviterName,
    expiresAt,
  });

  try {
    await sendMail({ to, ...mail });
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to send workspace invite email',
      undefined,
      e,
    );
  }
}
