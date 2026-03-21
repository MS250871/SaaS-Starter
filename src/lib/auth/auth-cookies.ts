'use server';

import { cookies } from 'next/headers';
import { encryptToken, decryptToken } from '../security/crypto';
import { randomUUID } from './auth-utils';
import { OtpPurpose } from '@/generated/prisma/client';

/* -------------------------------------------------------------------------- */
/*                               CONFIG                                       */
/* -------------------------------------------------------------------------- */

const IS_PROD = process.env.NODE_ENV === 'production';

/* -------------------------------------------------------------------------- */
/*                               AUTH FLOW COOKIES                            */
/* -------------------------------------------------------------------------- */

export type AuthIntent = 'free' | 'paid';
export type AuthFlow = 'login' | 'signup';

export async function setAuthCookies({
  flow,
  intent,
}: {
  flow: AuthFlow;
  intent?: AuthIntent;
}) {
  const store = await cookies();

  if (intent) {
    const existingIntent = store.get('auth_intent')?.value;
    if (!existingIntent) {
      store.set('auth_intent', intent, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'lax',
        path: '/',
      });
    }
  }

  store.set('auth_flow', flow, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getAuthIntent(): Promise<AuthIntent | undefined> {
  const store = await cookies();
  return store.get('auth_intent')?.value as AuthIntent | undefined;
}

export async function getAuthFlow(): Promise<AuthFlow | undefined> {
  const store = await cookies();
  return store.get('auth_flow')?.value as AuthFlow | undefined;
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete('auth_intent');
  store.delete('auth_flow');
}

/* -------------------------------------------------------------------------- */
/*                         VERIFICATION SESSION (ENCRYPTED)                   */
/* -------------------------------------------------------------------------- */

const VERIFY_COOKIE = 'verify_session';

export type VerificationStep = 'email' | 'phone' | 'done';
export type VerificationMode = 'email' | 'phone';

export type VerificationSession = {
  verificationId: string;
  authAccountId: string;
  otpPurpose: OtpPurpose;

  mode: VerificationMode;
  step: VerificationStep;

  identityId?: string;
  customerId?: string;

  intent?: AuthIntent;

  createdAt: number;
};

export async function setVerificationSession(
  payload: VerificationSession,
  ttlSeconds: number = 15 * 60,
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
  const maxAgeMs = 15 * 60 * 1000;
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

  identityId?: string;
  customerId?: string;

  workspaceId?: string;
  membershipId?: string;

  platformRole?: string;
  workspaceRole?: string;

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
    maxAge: ttlSeconds + 15 * 24 * 60 * 60, // grace buffer
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
    maxAge: 365 * 24 * 60 * 60,
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
