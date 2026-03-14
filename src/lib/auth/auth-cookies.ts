'use server';

import { cookies } from 'next/headers';
import { randomUUID } from './random';

export type AuthIntent = 'free' | 'paid';
export type AuthFlow = 'login' | 'signup';

/* ------------------ AUTH FLOW COOKIES ------------------ */

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
      store.set('auth_intent', intent, { httpOnly: true, path: '/' });
    }
  }

  store.set('auth_flow', flow, { httpOnly: true, path: '/' });
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

/* ------------------ VERIFICATION SESSION ------------------ */

export async function setVerificationSession(id: string, ttlSeconds: number) {
  const store = await cookies();
  store.set('verify_session_id', id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds,
  });
}

export async function getVerificationSession(): Promise<string | undefined> {
  const store = await cookies();
  return store.get('verify_session_id')?.value;
}

export async function clearVerificationSession() {
  const store = await cookies();
  store.delete('verify_session_id');
}

/* ------------------ USER AUTH SESSION ------------------ */

export async function setUserSession({
  sessionId,
  expiresAt,
}: {
  sessionId: string;
  expiresAt: Date;
}) {
  const store = await cookies();
  store.set('user_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge:
      Math.floor((expiresAt.getTime() - Date.now()) / 1000) + 15 * 24 * 60 * 60, // add 15 days to expiresAt to ensure cookie expires after session expiration
  });
}

export async function getUserSession(): Promise<string | undefined> {
  const store = await cookies();
  return store.get('user_session')?.value;
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete('user_session');
}

/* ------------------ DEVICE ID ------------------ */

export async function setDeviceId(deviceId: string) {
  const store = await cookies();
  store.set('device_id', deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
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
