import { sendSMS } from './transport-sms';
import { otpSms } from './templates/otp-template';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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
  if (!numbers || numbers.length === 0 || !otp) {
    throwError(ERR.INVALID_INPUT, 'Phone numbers and OTP are required');
  }

  const message = otpSms({ brand, otp });

  try {
    const result = await sendSMS({
      numbers,
      message,
      templateId,
    });

    return result;
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to send OTP SMS',
      undefined,
      e,
    );
  }
}
