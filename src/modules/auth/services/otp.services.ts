import { otpCrud, otpQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { OtpPurpose } from '@/generated/prisma/client';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  buildOtpPayload,
  hashOtp,
} from '@/lib/auth/auth-utils';

/**
 * Get OTP request by ID
 */
export async function getOtpRequestById(id: string) {
  return otpQueries.byId(id);
}

/**
 * Get latest OTP request for auth account + purpose
 */
export async function getLatestOtpRequest(
  authAccountId: string,
  otpPurpose: OtpPurpose,
) {
  return otpQueries.findFirst({
    where: {
      authAccountId,
      otpPurpose,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create OTP request
 */
export async function createOtpRequest(data: CreateInput<'OtpRequest'>) {
  return otpCrud.create(data);
}

/**
 * Increment OTP attempt count
 */
export async function incrementOtpAttempts(id: string) {
  const otp = await getOtpRequestById(id);

  if (!otp) {
    throw new Error('OTP request not found');
  }

  return otpCrud.update(id, {
    attempts: otp.attempts + 1,
  });
}

/**
 * Increment resend count
 */
export async function incrementResendCount(id: string) {
  const otp = await getOtpRequestById(id);

  if (!otp) {
    throw new Error('OTP request not found');
  }

  return otpCrud.update(id, {
    resendCount: otp.resendCount + 1,
  });
}

/**
 * Update OTP request
 */
export async function updateOtpRequest(
  id: string,
  data: UpdateInput<'OtpRequest'>,
) {
  return otpCrud.update(id, data);
}

/**
 * Delete OTP request
 */
export async function deleteOtpRequest(id: string) {
  return otpCrud.delete(id);
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(otp: { expiresAt: Date }) {
  return new Date() > otp.expiresAt;
}

/**
 * Validate OTP attempts
 */
export function hasExceededAttempts(
  otp: { attempts: number },
  maxAttempts = OTP_MAX_ATTEMPTS,
) {
  return otp.attempts >= maxAttempts;
}

/**
 * Validate resend limit
 */
export function hasExceededResends(
  otp: { resendCount: number },
  maxResends = OTP_MAX_RESENDS,
) {
  return otp.resendCount >= maxResends;
}

/**
 * Compare provided OTP with stored hash
 */
export function compareOtp(providedOtp: string, storedHash: string) {
  return hashOtp(providedOtp) === storedHash;
}

/**
 * Generate a new OTP and store request
 */
export async function generateOtp(params: {
  authAccountId: string;
  workspaceId?: string | null;
  otpPurpose: OtpPurpose;
}) {
  const { otp, payload } = buildOtpPayload(params);

  await createOtpRequest(payload);

  return {
    otp,
    verificationId: payload.verificationId,
  };
}

/**
 * Resend OTP
 */
export async function resendOtp(params: {
  authAccountId: string;
  otpPurpose: OtpPurpose;
  workspaceId?: string | null;
}) {
  const latest = await getLatestOtpRequest(
    params.authAccountId,
    params.otpPurpose,
  );

  if (!latest) {
    throw new Error('OTP request not found');
  }

  if (hasExceededResends(latest)) {
    throw new Error('Maximum OTP resends exceeded');
  }

  await incrementResendCount(latest.id);

  return generateOtp({
    authAccountId: params.authAccountId,
    workspaceId: params.workspaceId,
    otpPurpose: params.otpPurpose,
  });
}

/**
 * Verify OTP
 */
export async function verifyOtp(params: {
  authAccountId: string;
  otpPurpose: OtpPurpose;
  otp: string;
}) {
  const latest = await getLatestOtpRequest(
    params.authAccountId,
    params.otpPurpose,
  );

  if (!latest) {
    throw new Error('OTP request not found');
  }

  if (hasExceededAttempts(latest)) {
    throw new Error('Maximum OTP attempts exceeded');
  }

  if (isOtpExpired(latest)) {
    throw new Error('OTP expired');
  }

  if (!compareOtp(params.otp, latest.otpHash)) {
    await incrementOtpAttempts(latest.id);
    throw new Error('Invalid OTP');
  }

  return {
    success: true,
    authAccountId: latest.authAccountId,
  };
}
