import { sessionCrud, sessionQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SessionEndReason } from '@/generated/prisma/client';
import type { Session } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';

/**
 * Get session by ID
 */
export async function getSessionById(id: string) {
  return sessionQueries.byId(id);
}

/**
 * Create session
 */
export async function createSession(data: CreateInput<'Session'>) {
  return sessionCrud.create(data);
}

/**
 * Update session
 */
export async function updateSession(id: string, data: UpdateInput<'Session'>) {
  return sessionCrud.update(id, data);
}

/**
 * Mark session activity (heartbeat / last seen)
 */
export async function updateSessionLastSeen(id: string) {
  return sessionCrud.update(id, {
    lastSeenAt: new Date(),
  });
}

/**
 * End session
 */
export async function endSession(
  id: string,
  reason: SessionEndReason = SessionEndReason.LOGOUT,
) {
  return sessionCrud.update(id, {
    isActive: false,
    endedAt: new Date(),
    endedReason: reason,
  });
}

/**
 * End all sessions for an identity
 */
export async function endAllIdentitySessions(
  identityId: string,
  reason: SessionEndReason = SessionEndReason.REVOKED,
) {
  const sessions = (await sessionQueries.many({
    where: {
      identityId,
      isActive: true,
    },
  })) as Session[];

  const updates = sessions.map((s) =>
    sessionCrud.update(s.id, {
      isActive: false,
      endedAt: new Date(),
      endedReason: reason,
    }),
  );

  return Promise.all(updates);
}

/**
 * End all sessions for a customer
 */
export async function endAllCustomerSessions(
  customerId: string,
  reason: SessionEndReason = SessionEndReason.REVOKED,
) {
  const sessions = (await sessionQueries.many({
    where: {
      customerId,
      isActive: true,
    },
  })) as Session[];

  const updates = sessions.map((s) =>
    sessionCrud.update(s.id, {
      isActive: false,
      endedAt: new Date(),
      endedReason: reason,
    }),
  );

  return Promise.all(updates);
}

/**
 * List active sessions for identity
 */
export async function listIdentitySessions(identityId: string) {
  return sessionQueries.many({
    where: {
      identityId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List active sessions for customer
 */
export async function listCustomerSessions(customerId: string) {
  return sessionQueries.many({
    where: {
      customerId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Find active session by device fingerprint
 */
export async function findSessionByFingerprint(deviceFingerprint: string) {
  return sessionQueries.findFirst({
    where: {
      deviceFingerprint,
      isActive: true,
    },
  });
}

/**
 * Replace existing device session
 * (used when same device logs in again)
 */
export async function replaceSession(
  existingSessionId: string,
  newSession: CreateInput<'Session'>,
) {
  await endSession(existingSessionId, SessionEndReason.REPLACED);

  return createSession(newSession);
}

export async function getSessionEntitlements() {
  const session = await getUserSession();

  return {
    features: session?.features ?? [],
    limits: session?.limits ?? {},
  };
}

export async function getSession() {
  return getUserSession();
}
