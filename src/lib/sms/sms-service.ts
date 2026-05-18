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

  const hasSmsConfig = Boolean(
    process.env.COMBIRDS_BASE_URL &&
      process.env.COMBIRDS_API_KEY &&
      process.env.COMBIRDS_SENDER_ID,
  );

  if (process.env.NODE_ENV !== 'production' && !hasSmsConfig) {
    console.info('[DEV OTP SMS]', {
      numbers,
      otp,
      brand,
    });
    return;
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
