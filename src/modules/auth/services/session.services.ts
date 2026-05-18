import { sessionCrud, sessionQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { SessionEndReason } from '@/generated/prisma/client';
import type { Session } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import {
  USER_SESSION_ACTIVITY_WRITE_INTERVAL_SECONDS,
  USER_SESSION_LIFETIME_SECONDS,
  USER_SESSION_REFRESH_THRESHOLD_SECONDS,
} from '@/lib/auth/auth-config';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

const USER_SESSION_LIFETIME_MS = USER_SESSION_LIFETIME_SECONDS * 1000;
const USER_SESSION_REFRESH_THRESHOLD_MS =
  USER_SESSION_REFRESH_THRESHOLD_SECONDS * 1000;
const USER_SESSION_ACTIVITY_WRITE_INTERVAL_MS =
  USER_SESSION_ACTIVITY_WRITE_INTERVAL_SECONDS * 1000;

/**
 * Get session by ID
 */
export async function getSessionById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  const session = await sessionQueries.findUnique({
    where: { id },
  });

  if (!session) {
    throwError(ERR.NOT_FOUND, 'Session not found');
  }

  return session;
}

export async function findSessionById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  return sessionQueries.findUnique({
    where: { id },
  });
}

/**
 * Create session
 */
export async function createSession(data: CreateInput<'Session'>) {
  if (!data?.identityId) {
    throwError(ERR.INVALID_INPUT, 'Session must belong to identity');
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

  const sessions = await sessionQueries.many({
    where: {
      identityId,
      isActive: true,
    },
  });

  const updates = sessions.map((s) =>
    sessionCrud.update(s.id, {
      isActive: false,
      endedAt: new Date(),
      endedReason: reason,
    }),
  );

  return Promise.all(updates);
}

export async function endMembershipSessions(
  membershipId: string,
  reason: SessionEndReason = SessionEndReason.REVOKED,
) {
  if (!membershipId) {
    throwError(ERR.INVALID_INPUT, 'Membership ID is required');
  }

  const sessions = await sessionQueries.many({
    where: {
      membershipId,
      isActive: true,
    },
  });

  const updates = sessions.map((session) =>
    sessionCrud.update(session.id, {
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

export async function findActiveSessionByContext(params: {
  identityId: string;
  workspaceId?: string;
  customerId?: string;
  membershipId?: string;
  deviceFingerprint?: string;
}) {
  if (!params.identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return sessionQueries.findFirst({
    where: {
      identityId: params.identityId,
      workspaceId: params.workspaceId ?? null,
      customerId: params.customerId ?? null,
      membershipId: params.membershipId ?? null,
      deviceFingerprint: params.deviceFingerprint ?? null,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function expireIdentitySessionsIfNeeded(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const now = new Date();

  return sessionQueries.delegate.updateMany({
    where: {
      identityId,
      isActive: true,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      isActive: false,
      endedAt: now,
      endedReason: SessionEndReason.EXPIRED,
    },
  });
}

export async function syncSessionActivity(sessionId: string) {
  if (!sessionId) {
    throwError(ERR.INVALID_INPUT, 'Session ID is required');
  }

  const session = await sessionQueries.findUnique({
    where: {
      id: sessionId,
    },
  });

  if (!session) {
    return {
      status: 'missing' as const,
      session: null,
    };
  }

  if (!session.isActive) {
    return {
      status: 'inactive' as const,
      session,
    };
  }

  const now = new Date();

  if (session.expiresAt <= now) {
    const expiredSession = await sessionQueries.delegate.update({
      where: {
        id: session.id,
      },
      data: {
        isActive: false,
        endedAt: session.endedAt ?? now,
        endedReason: session.endedReason ?? SessionEndReason.EXPIRED,
      },
    });

    return {
      status: 'expired' as const,
      session: expiredSession,
    };
  }

  const remainingMs = session.expiresAt.getTime() - now.getTime();
  const shouldRefresh = remainingMs <= USER_SESSION_REFRESH_THRESHOLD_MS;
  const shouldUpdateLastSeen =
    !session.lastSeenAt ||
    now.getTime() - session.lastSeenAt.getTime() >=
      USER_SESSION_ACTIVITY_WRITE_INTERVAL_MS;

  if (!shouldRefresh && !shouldUpdateLastSeen) {
    return {
      status: 'active' as const,
      session,
    };
  }

  const updatedSession = await sessionQueries.delegate.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: now,
      ...(shouldRefresh
        ? {
            expiresAt: new Date(now.getTime() + USER_SESSION_LIFETIME_MS),
          }
        : {}),
    },
  });

  return {
    status: shouldRefresh ? ('refreshed' as const) : ('active' as const),
    session: updatedSession,
  };
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

export async function extendSessionIfNeeded(session: Session) {
  const now = new Date();

  const remaining = session.expiresAt.getTime() - now.getTime();

  const REFRESH_THRESHOLD = USER_SESSION_REFRESH_THRESHOLD_MS;

  if (remaining < REFRESH_THRESHOLD) {
    return updateSession(session.id, {
      expiresAt: new Date(now.getTime() + USER_SESSION_LIFETIME_MS),
    });
  }

  return session;
}
