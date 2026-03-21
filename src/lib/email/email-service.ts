import { sendMail } from './transport';
import { otpTemplate } from './templates/otp-template';

export async function sendOtpEmail({
  to,
  otp,
  name,
}: {
  to: string;
  otp: string;
  name?: string;
}) {
  const mail = otpTemplate({ otp, name });
  await sendMail({ to, ...mail });
}
