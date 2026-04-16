import crypto from 'crypto';
import {
  platformInviteCrud,
  platformInviteQueries,
} from '@/modules/platform/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { PlatformRole } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Generate invite token
 */
export function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get invite by ID
 */
export async function getPlatformInviteById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  const invite = await platformInviteQueries.byId(id);
  if (!invite) throwError(ERR.NOT_FOUND, 'Invite not found');

  return invite;
}

/**
 * Find invite by token
 */
export async function findPlatformInviteByToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, 'Token is required');

  return platformInviteQueries.findFirst({
    where: { token },
  });
}

/**
 * Create invite (generic)
 */
export async function createPlatformInvite(
  data: CreateInput<'PlatformInvite'>,
) {
  if (!data?.email) {
    throwError(ERR.INVALID_INPUT, 'Invalid invite data');
  }

  try {
    return await platformInviteCrud.create({
      ...data,
      email: data.email.toLowerCase(),
      token: data.token ?? generateInviteToken(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create platform invite', undefined, e);
  }
}

/**
 * Create platform invite (typed helper)
 */
export async function createPlatformInviteEntry(params: {
  email: string;
  invitedById?: string | null;
  role?: PlatformRole;
  expiresAt?: Date | null;
}) {
  if (!params.email) {
    throwError(ERR.INVALID_INPUT, 'Invalid invite params');
  }

  try {
    return await platformInviteCrud.create({
      email: params.email.toLowerCase(),
      invitedById: params.invitedById ?? undefined,
      role: params.role ?? PlatformRole.PLATFORM_STAFF,
      token: generateInviteToken(),
      expiresAt: params.expiresAt ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create platform invite', undefined, e);
  }
}

/**
 * Update invite
 */
export async function updatePlatformInvite(
  id: string,
  data: UpdateInput<'PlatformInvite'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await platformInviteCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update invite', undefined, e);
  }
}

/**
 * Accept invite
 */
export async function acceptPlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await platformInviteCrud.update(id, {
      status: 'ACCEPTED',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to accept invite', undefined, e);
  }
}

/**
 * Revoke invite
 */
export async function revokePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await platformInviteCrud.update(id, {
      status: 'REVOKED',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to revoke invite', undefined, e);
  }
}

/**
 * Expire invite
 */
export async function expirePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await platformInviteCrud.update(id, {
      status: 'EXPIRED',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to expire invite', undefined, e);
  }
}

/**
 * Delete invite
 */
export async function deletePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await platformInviteCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete invite', undefined, e);
  }
}

/**
 * List platform invites
 */
export async function listPlatformInvites() {
  return platformInviteQueries.many({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check expired
 */
export function isPlatformInviteExpired(invite: { expiresAt?: Date | null }) {
  if (!invite.expiresAt) return false;
  return new Date() > invite.expiresAt;
}

/**
 * Validate token
 */
export async function validatePlatformInviteToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, 'Token is required');

  const invite = await findPlatformInviteByToken(token);

  if (!invite) {
    throwError(ERR.NOT_FOUND, 'Invalid invite token');
  }
  if (invite.status !== 'PENDING') {
    throwError(ERR.INVALID_INPUT, 'Invite already used or revoked');
  }
  if (isPlatformInviteExpired(invite)) {
    throwError(ERR.INVALID_INPUT, 'Invite has expired');
  }

  return invite;
}
