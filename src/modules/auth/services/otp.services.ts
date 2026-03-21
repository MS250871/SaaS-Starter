import { otpCrud, otpQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { OtpPurpose } from '@/generated/prisma/client';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  buildOtpPayload,
  hashOtp,
} from '@/lib/auth/auth-utils';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get OTP request by ID
 */
export async function getOtpRequestById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OTP request ID is required');
  }

  const otp = await otpQueries.byId(id);

  if (!otp) {
    throwError(ERR.NOT_FOUND, 'OTP request not found');
  }

  return otp;
}

/**
 * Get latest OTP request
 */
export async function getLatestOtpRequest(
  authAccountId: string,
  otpPurpose: OtpPurpose,
) {
  if (!authAccountId || !otpPurpose) {
    throwError(ERR.INVALID_INPUT, 'authAccountId and otpPurpose are required');
  }

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
  if (!data?.authAccountId || !data?.otpPurpose) {
    throwError(ERR.INVALID_INPUT, 'Invalid OTP request payload');
  }

  try {
    return await otpCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create OTP request', undefined, e);
  }
}

/**
 * Increment OTP attempt count
 */
export async function incrementOtpAttempts(id: string) {
  const otp = await getOtpRequestById(id);

  try {
    return await otpCrud.update(id, {
      attempts: otp.attempts + 1,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to increment OTP attempts', undefined, e);
  }
}

/**
 * Increment resend count
 */
export async function incrementResendCount(id: string) {
  const otp = await getOtpRequestById(id);

  try {
    return await otpCrud.update(id, {
      resendCount: otp.resendCount + 1,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to increment OTP resend count',
      undefined,
      e,
    );
  }
}

/**
 * Update OTP request
 */
export async function updateOtpRequest(
  id: string,
  data: UpdateInput<'OtpRequest'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OTP request ID is required');
  }

  try {
    return await otpCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update OTP request', undefined, e);
  }
}

/**
 * Delete OTP request
 */
export async function deleteOtpRequest(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OTP request ID is required');
  }

  try {
    return await otpCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete OTP request', undefined, e);
  }
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
 * Compare OTP
 */
export function compareOtp(providedOtp: string, storedHash: string) {
  return hashOtp(providedOtp) === storedHash;
}

/**
 * Generate OTP
 */
export async function generateOtp(params: {
  authAccountId: string;
  workspaceId?: string | null;
  otpPurpose: OtpPurpose;
}) {
  if (!params.authAccountId || !params.otpPurpose) {
    throwError(ERR.INVALID_INPUT, 'Invalid OTP generation params');
  }

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
  if (!params.authAccountId || !params.otpPurpose) {
    throwError(ERR.INVALID_INPUT, 'Invalid resend OTP params');
  }

  const latest = await getLatestOtpRequest(
    params.authAccountId,
    params.otpPurpose,
  );

  if (!latest) {
    throwError(ERR.NOT_FOUND, 'OTP request not found');
  }

  if (hasExceededResends(latest)) {
    throwError(ERR.LIMIT_EXCEEDED, 'Maximum OTP resends exceeded');
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
  if (!params.authAccountId || !params.otpPurpose || !params.otp) {
    throwError(ERR.INVALID_INPUT, 'Invalid OTP verification params');
  }

  const latest = await getLatestOtpRequest(
    params.authAccountId,
    params.otpPurpose,
  );

  if (!latest) {
    throwError(ERR.NOT_FOUND, 'OTP request not found');
  }

  if (hasExceededAttempts(latest)) {
    throwError(ERR.LIMIT_EXCEEDED, 'Maximum OTP attempts exceeded');
  }

  if (isOtpExpired(latest)) {
    throwError(ERR.OTP_EXPIRED, 'OTP expired');
  }

  if (!compareOtp(params.otp, latest.otpHash)) {
    await incrementOtpAttempts(latest.id);
    throwError(ERR.OTP_INVALID, 'Invalid OTP');
  }

  return {
    success: true,
    authAccountId: latest.authAccountId,
  };
}
