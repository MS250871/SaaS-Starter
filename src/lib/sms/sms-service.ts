import { sendSMS } from './transport-sms';
import { otpSms } from './templates/otp-template';

const TEMPLATE_ID = '1707168926925165526';

export async function sendOtpSms({
  numbers,
  brand,
  otp,
  templateId = TEMPLATE_ID,
}: {
  numbers: string[];
  brand?: string;
  otp: string;
  templateId?: string;
}) {
  const message = otpSms({ brand, otp });
  const result = await sendSMS({ numbers, message, templateId });
  return result;
}
