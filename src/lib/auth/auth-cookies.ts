'use server';

import { cookies, headers } from 'next/headers';
import { encryptToken, decryptToken } from '../security/crypto';
import { randomUUID } from './auth-utils';
import {
  AUTH_FLOW_COOKIE_MAX_AGE_SECONDS,
  DEVICE_ID_MAX_AGE_SECONDS,
  USER_SESSION_COOKIE_BUFFER_SECONDS,
  VERIFICATION_SESSION_MAX_AGE_SECONDS,
} from './auth-config';
import {
  authCookiesSchema,
  verificationSessionSchema,
  sessionPayloadSchema,
  resolvedSessionPayloadSchema,
  deviceIdSchema,
  type AuthCookies,
  type VerificationSession,
  type SessionClaims,
  type SessionPayload,
} from './auth.schema';
import {
  getRequestContext,
  maybeGetRequestContext,
  runWithContext,
} from '@/lib/context/request-context';
import { buildActorContext } from '@/lib/context/build-actor';
import { runWithActor } from '@/lib/context/actor-context';
import { resolveSessionContext } from '@/lib/request/resolve-session-context';

/* -------------------------------------------------------------------------- */
/*                               CONFIG                                       */
/* -------------------------------------------------------------------------- */

const IS_PROD = process.env.NODE_ENV === 'production';
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
    maxAge: AUTH_FLOW_COOKIE_MAX_AGE_SECONDS,
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

    if (
      Date.now() - validated.data.createdAt >
      AUTH_FLOW_COOKIE_MAX_AGE_SECONDS * 1000
    ) {
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
  ttlSeconds: number = VERIFICATION_SESSION_MAX_AGE_SECONDS,
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
    return null;
  }

  const data = validated.data;

  if (
    Date.now() - data.createdAt >
    VERIFICATION_SESSION_MAX_AGE_SECONDS * 1000
  ) {
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

export async function readUserSessionCookiePayload(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await decryptToken<unknown>(token);
  if (!session) return null;

  const validated = sessionPayloadSchema.safeParse(session);

  if (!validated.success) {
    return null;
  }

  return validated.data;
}

export async function setUserSession(payload: SessionClaims | SessionPayload) {
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
    maxAge: ttlSeconds + USER_SESSION_COOKIE_BUFFER_SECONDS,
  });
}

export async function getUserSession(): Promise<SessionPayload | null> {
  const claims = await readUserSessionCookiePayload();

  if (!claims) return null;

  if (Date.now() > claims.expiresAt) {
    return null;
  }

  if (!claims.isActive) {
    return null;
  }

  const existingContext = maybeGetRequestContext();

  if (
    existingContext?.session &&
    existingContext.session.sessionId === claims.sessionId
  ) {
    return existingContext.session;
  }

  if (existingContext) {
    const currentActor = buildActorContext({
      identityId: claims.identityId,
      customerId: claims.customerId,
      platformRole: claims.platformRoles?.[0],
      platformRoleKeys: claims.platformRoleKeys,
      platformRoleSystemKeys: claims.platformRoleSystemKeys,
      workspaceId: claims.workspaceId,
      workspaceRole: claims.workspaceRole,
      workspaceRoleKey: claims.workspaceRoleKey,
      workspaceRoleSystemKey: claims.workspaceRoleSystemKey,
      membershipId: claims.membershipId,
    });

    const { session } = await runWithActor(currentActor, () =>
      resolveSessionContext({
        requestContext: existingContext,
        sessionClaims: claims,
      }),
    );

    return session;
  }

  const hdrs = await headers();
  const rawRequestContext = hdrs.get('x-request-context');

  if (!rawRequestContext) {
    return resolvedSessionPayloadSchema.parse({
      ...claims,
      permissions: [],
      features: [],
      limits: {},
    });
  }

  const requestContext = JSON.parse(rawRequestContext);
  const { session } = await runWithContext(requestContext, () =>
    resolveSessionContext({
      requestContext: getRequestContext(),
      sessionClaims: claims,
    }),
  );

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

  const parsed = deviceIdSchema.parse(deviceId);

  store.set('device_id', parsed, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
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
