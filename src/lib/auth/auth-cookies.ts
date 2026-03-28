'use server';

import { cookies } from 'next/headers';
import { encryptToken, decryptToken } from '../security/crypto';
import { randomUUID } from './auth-utils';
import { OtpPurpose } from '@/generated/prisma/client';
import { PlatformRole, WorkspaceRole } from '@/generated/prisma/client';

/* -------------------------------------------------------------------------- */
/*                               CONFIG                                       */
/* -------------------------------------------------------------------------- */

const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_AGE = 60 * 10 * 1 * 1; // 10 min
const VERIFY_MAX_AGE = 15 * 60; // 15 min
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const DEVICE_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/* -------------------------------------------------------------------------- */
/*                               AUTH FLOW COOKIES                            */
/* -------------------------------------------------------------------------- */

export type AuthCookies = {
  flow: 'signup' | 'login';
  intent?: 'free' | 'paid';
  entry: 'platform' | 'workspace' | 'invite';
  inviteToken?: string;
  workspaceId?: string | null;
  createdAt: number;
};

export async function setAuthCookies({ data }: { data: AuthCookies }) {
  const store = await cookies();

  store.set('auth_flow', JSON.stringify(data), {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function getAuthCookie(): Promise<AuthCookies | null> {
  const store = await cookies();
  const raw = store.get('auth_flow')?.value;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthCookies;
    if (Date.now() - parsed.createdAt > MAX_AGE) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete('auth_flow');
}

/* -------------------------------------------------------------------------- */
/*                         VERIFICATION SESSION (ENCRYPTED)                   */
/* -------------------------------------------------------------------------- */

const VERIFY_COOKIE = 'verify_session';

export type VerificationStep = 'email' | 'phone' | 'done';
export type VerificationMode = 'email' | 'phone';

export type VerificationSession = {
  verificationId: string | null | undefined;
  authAccountId: string;
  otpPurpose: OtpPurpose;

  mode: VerificationMode;
  step: VerificationStep;

  identityId?: string;

  createdAt: number;
};

export async function setVerificationSession(
  payload: VerificationSession,
  ttlSeconds: number = VERIFY_MAX_AGE,
) {
  const store = await cookies();

  const token = await encryptToken(payload);

  store.set(VERIFY_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds,
  });
}

export async function getVerificationSession(): Promise<VerificationSession | null> {
  const store = await cookies();
  const token = store.get(VERIFY_COOKIE)?.value;

  if (!token) return null;

  const session = await decryptToken<VerificationSession>(token);
  if (!session) return null;

  // expiry safety
  const maxAgeMs = VERIFY_MAX_AGE * 1000;
  if (Date.now() - session.createdAt > maxAgeMs) {
    await clearVerificationSession();
    return null;
  }

  return session;
}

export async function clearVerificationSession() {
  const store = await cookies();
  store.delete(VERIFY_COOKIE);
}

export async function updateVerificationSession(
  updates: Partial<VerificationSession>,
) {
  const existing = await getVerificationSession();

  if (!existing) {
    throw new Error('Verification session not found');
  }

  const updated: VerificationSession = {
    ...existing,
    ...updates,
  };

  await setVerificationSession(updated);
}

/* -------------------------------------------------------------------------- */
/*                      USER SESSION (ACTOR SNAPSHOT)                         */
/* -------------------------------------------------------------------------- */

const SESSION_COOKIE = 'user_session';

export type SessionPayload = {
  sessionId: string;

  identityId: string;

  workspaceId?: string;
  membershipId?: string;

  platformRole?: PlatformRole;
  workspaceRole?: WorkspaceRole;

  isActive: boolean;

  permissions: string[];
  features: string[];
  limits: Record<string, number>;

  createdAt: number;
  expiresAt: number;

  // optional future-proofing
  version?: number;
};

export async function setUserSession(payload: SessionPayload) {
  const store = await cookies();

  const token = await encryptToken(payload);

  const ttlSeconds = Math.max(
    0,
    Math.floor((payload.expiresAt - Date.now()) / 1000),
  );

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds + SESSION_MAX_AGE, // grace buffer
  });
}

export async function getUserSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await decryptToken<SessionPayload>(token);
  if (!session) return null;

  // expiry check
  if (Date.now() > session.expiresAt) {
    await clearUserSession();
    return null;
  }

  // active check
  if (!session.isActive) {
    await clearUserSession();
    return null;
  }

  return session;
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/* -------------------------------------------------------------------------- */
/*                                DEVICE ID                                   */
/* -------------------------------------------------------------------------- */

export async function setDeviceId(deviceId: string) {
  const store = await cookies();

  store.set('device_id', deviceId, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_ID_MAX_AGE,
  });
}

export async function getDeviceId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get('device_id')?.value;
}

export async function clearDeviceId() {
  const store = await cookies();
  store.delete('device_id');
}

export async function ensureDeviceId() {
  let id = await getDeviceId();

  if (!id) {
    id = randomUUID();
    await setDeviceId(id);
  }

  return id;
}
