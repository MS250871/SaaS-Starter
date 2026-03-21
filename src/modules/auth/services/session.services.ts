import { sessionCrud, sessionQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SessionEndReason } from '@/generated/prisma/client';
import type { Session } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get session by ID
 */
export async function getSessionById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  const session = await sessionQueries.byId(id);

  if (!session) {
    throwError(ERR.NOT_FOUND, 'Session not found');
  }

  return session;
}

/**
 * Create session
 */
export async function createSession(data: CreateInput<'Session'>) {
  if (!data?.identityId && !data?.customerId) {
    throwError(
      ERR.INVALID_INPUT,
      'Session must belong to identity or customer',
    );
  }

  try {
    return await sessionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create session', undefined, e);
  }
}

/**
 * Update session
 */
export async function updateSession(id: string, data: UpdateInput<'Session'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  try {
    return await sessionCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update session', undefined, e);
  }
}

/**
 * Update last seen
 */
export async function updateSessionLastSeen(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  try {
    return await sessionCrud.update(id, {
      lastSeenAt: new Date(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update session activity', undefined, e);
  }
}

/**
 * End session
 */
export async function endSession(
  id: string,
  reason: SessionEndReason = SessionEndReason.LOGOUT,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  try {
    return await sessionCrud.update(id, {
      isActive: false,
      endedAt: new Date(),
      endedReason: reason,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to end session', undefined, e);
  }
}

/**
 * End all sessions for identity
 */
export async function endAllIdentitySessions(
  identityId: string,
  reason: SessionEndReason = SessionEndReason.REVOKED,
) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

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
 * End all sessions for customer
 */
export async function endAllCustomerSessions(
  customerId: string,
  reason: SessionEndReason = SessionEndReason.REVOKED,
) {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

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
 * List sessions
 */
export async function listIdentitySessions(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

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

export async function listCustomerSessions(customerId: string) {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

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
 * Find session by fingerprint
 */
export async function findSessionByFingerprint(deviceFingerprint: string) {
  if (!deviceFingerprint) {
    throwError(ERR.INVALID_INPUT, 'Device fingerprint is required');
  }

  return sessionQueries.findFirst({
    where: {
      deviceFingerprint,
      isActive: true,
    },
  });
}

/**
 * Replace session
 */
export async function replaceSession(
  existingSessionId: string,
  newSession: CreateInput<'Session'>,
) {
  if (!existingSessionId) {
    throwError(ERR.INVALID_INPUT, 'Existing session ID is required');
  }

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
