import { sendMail } from './transport';
import { otpTemplate } from './templates/otp-template';
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
