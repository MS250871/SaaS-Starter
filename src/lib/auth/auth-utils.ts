import crypto from 'crypto';
import type { RequestContext } from '../context/request-context';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { OtpPurpose } from '@/generated/prisma/client';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { deviceIdSchema } from '@/lib/auth/auth.schema';
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_RESENDS = 3;
export const OTP_EXPIRY_MINUTES = 10;

export function createFingerprint(ctx: RequestContext) {
  const raw = `${ctx.browser}-${ctx.os}-${ctx.device}-${ctx.userAgent}`;

  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function hashOtp(otp: string) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Generates numeric OTP
 */
export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';

  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }

  return otp;
}

export function randomUUID() {
  return crypto.randomUUID();
}

/**
 * Build OTP payload for DB insertion
 */
export function buildOtpPayload(params: {
  authAccountId: string;
  workspaceId?: string | null;
  otpPurpose: OtpPurpose;
}) {
  const otp = generateOtp();

  const payload: CreateInput<'OtpRequest'> = {
    authAccountId: params.authAccountId,
    workspaceId: params.workspaceId ?? undefined,
    otpPurpose: params.otpPurpose,

    verificationId: randomUUID(),

    otpHash: hashOtp(otp),

    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),

    attempts: 0,
    resendCount: 0,
  };

  return {
    otp,
    payload,
  };
}

export function buildOtpUpdatePayload(params: {
  existing: {
    resendCount: number;
  };
}) {
  const otp = generateOtp();

  const payload: UpdateInput<'OtpRequest'> = {
    otpHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    attempts: 0, // reset attempts
    resendCount: params.existing.resendCount + 1,
  };

  return {
    otp,
    payload,
  };
}

const DEFAULT_COUNTRY: CountryCode = 'IN';

export function normalizePhone(
  input: string,
  country: CountryCode = DEFAULT_COUNTRY,
) {
  const cleaned = input.trim().replace(/\s+/g, '');

  // 🔥 STRICT INPUT CHECK
  if (!/^\+?\d+$/.test(cleaned)) {
    return { valid: false, e164: null };
  }

  const parsed = parsePhoneNumberFromString(cleaned, country);

  if (!parsed || !parsed.isValid()) {
    return { valid: false, e164: null };
  }

  return {
    valid: true,
    e164: parsed.number, // ✅ normalized
  };
}

export function ensureDeviceIdValue(raw?: string): string {
  if (!raw) return randomUUID();

  const parsed = deviceIdSchema.safeParse(raw);

  if (!parsed.success) {
    return randomUUID();
  }

  return parsed.data;
}
