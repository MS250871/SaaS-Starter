import crypto from 'crypto';
import {
  workspaceInviteCrud,
  workspaceInviteQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceRole } from '@/generated/prisma/client';
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
export async function getInviteById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  const invite = await workspaceInviteQueries.byId(id);
  if (!invite) throwError(ERR.NOT_FOUND, 'Invite not found');

  return invite;
}

/**
 * Find invite by token
 */
export async function findInviteByToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, 'Token is required');

  return workspaceInviteQueries.findFirst({
    where: { token },
  });
}

/**
 * Create invite
 */
export async function createInvite(data: CreateInput<'WorkspaceInvite'>) {
  if (!data?.workspaceId || !data?.email) {
    throwError(ERR.INVALID_INPUT, 'Invalid invite data');
  }

  try {
    return await workspaceInviteCrud.create({
      ...data,
      email: data.email.toLowerCase(),
      token: data.token ?? generateInviteToken(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create invite', undefined, e);
  }
}

/**
 * Create workspace invite
 */
export async function createWorkspaceInvite(params: {
  workspaceId: string;
  email: string;
  invitedById?: string | null;
  role?: WorkspaceRole;
  expiresAt?: Date | null;
}) {
  if (!params.workspaceId || !params.email) {
    throwError(ERR.INVALID_INPUT, 'Invalid invite params');
  }

  try {
    return await workspaceInviteCrud.create({
      workspaceId: params.workspaceId,
      email: params.email.toLowerCase(),
      invitedById: params.invitedById ?? undefined,
      role: params.role ?? WorkspaceRole.STAFF,
      token: generateInviteToken(),
      expiresAt: params.expiresAt ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create workspace invite', undefined, e);
  }
}

/**
 * Update invite
 */
export async function updateInvite(
  id: string,
  data: UpdateInput<'WorkspaceInvite'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await workspaceInviteCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update invite', undefined, e);
  }
}

/**
 * Accept invite
 */
export async function acceptInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await workspaceInviteCrud.update(id, {
      status: 'accepted',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to accept invite', undefined, e);
  }
}

/**
 * Revoke invite
 */
export async function revokeInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await workspaceInviteCrud.update(id, {
      status: 'revoked',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to revoke invite', undefined, e);
  }
}

/**
 * Expire invite
 */
export async function expireInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await workspaceInviteCrud.update(id, {
      status: 'expired',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to expire invite', undefined, e);
  }
}

/**
 * Delete invite
 */
export async function deleteInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Invite ID is required');

  try {
    return await workspaceInviteCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete invite', undefined, e);
  }
}

/**
 * List workspace invites
 */
export async function listWorkspaceInvites(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceInviteQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check expired
 */
export function isInviteExpired(invite: { expiresAt?: Date | null }) {
  if (!invite.expiresAt) return false;
  return new Date() > invite.expiresAt;
}

/**
 * Validate token
 */
export async function validateInviteToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, 'Token is required');

  const invite = await findInviteByToken(token);

  if (!invite) {
    throwError(ERR.NOT_FOUND, 'Invalid invite token');
  }
  if (invite.status !== 'pending') {
    throwError(ERR.INVALID_INPUT, 'Invite already used or revoked');
  }
  if (isInviteExpired(invite)) {
    throwError(ERR.INVALID_INPUT, 'Invite has expired');
  }

  return invite;
}
