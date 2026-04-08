'use server';

import { cookies } from 'next/headers';
import { encryptToken, decryptToken } from '../security/crypto';
import { randomUUID } from './auth-utils';
import {
  authCookiesSchema,
  verificationSessionSchema,
  sessionPayloadSchema,
  deviceIdSchema,
  type AuthCookies,
  type VerificationSession,
  type SessionPayload,
} from './auth.schema';

/* -------------------------------------------------------------------------- */
/*                               CONFIG                                       */
/* -------------------------------------------------------------------------- */

const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_AGE = 60 * 10;
const VERIFY_MAX_AGE = 15 * 60;
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEVICE_ID_MAX_AGE = 60 * 60 * 24 * 365;

/* -------------------------------------------------------------------------- */
/*                               AUTH FLOW COOKIES                            */
/* -------------------------------------------------------------------------- */

export async function setAuthCookies({ data }: { data: AuthCookies }) {
  const store = await cookies();

  const parsed = authCookiesSchema.parse(data); // 🔥 strict

  store.set('auth_flow', JSON.stringify(parsed), {
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
    const parsed = JSON.parse(raw);
    const validated = authCookiesSchema.safeParse(parsed);

    if (!validated.success) return null;

    if (Date.now() - validated.data.createdAt > MAX_AGE * 1000) {
      return null;
    }

    return validated.data;
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

export async function setVerificationSession(
  payload: VerificationSession,
  ttlSeconds: number = VERIFY_MAX_AGE,
) {
  const store = await cookies();

  const parsed = verificationSessionSchema.parse(payload);

  const token = await encryptToken(parsed);

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

  const session = await decryptToken<unknown>(token);
  if (!session) return null;

  const validated = verificationSessionSchema.safeParse(session);

  if (!validated.success) {
    await clearVerificationSession();
    return null;
  }

  const data = validated.data;

  if (Date.now() - data.createdAt > VERIFY_MAX_AGE * 1000) {
    await clearVerificationSession();
    return null;
  }

  return data;
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

  const updated = {
    ...existing,
    ...updates,
  };

  await setVerificationSession(updated);
}

/* -------------------------------------------------------------------------- */
/*                      USER SESSION (ACTOR SNAPSHOT)                         */
/* -------------------------------------------------------------------------- */

const SESSION_COOKIE = 'user_session';

export async function setUserSession(payload: SessionPayload) {
  const store = await cookies();

  const parsed = sessionPayloadSchema.parse(payload);

  const token = await encryptToken(parsed);

  const ttlSeconds = Math.max(
    0,
    Math.floor((parsed.expiresAt - Date.now()) / 1000),
  );

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds + SESSION_MAX_AGE,
  });
}

export async function getUserSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await decryptToken<unknown>(token);
  if (!session) return null;

  const validated = sessionPayloadSchema.safeParse(session);

  if (!validated.success) {
    await clearUserSession();
    return null;
  }

  const data = validated.data;

  if (Date.now() > data.expiresAt) {
    await clearUserSession();
    return null;
  }

  if (!data.isActive) {
    await clearUserSession();
    return null;
  }

  return data;
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

  const parsed = deviceIdSchema.parse(deviceId);

  store.set('device_id', parsed, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_ID_MAX_AGE,
  });
}

export async function getDeviceId(): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get('device_id')?.value;

  if (!value) return undefined;

  const validated = deviceIdSchema.safeParse(value);
  return validated.success ? validated.data : undefined;
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
