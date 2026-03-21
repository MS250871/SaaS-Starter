import crypto from 'crypto';
import {
  workspaceInviteCrud,
  workspaceInviteQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceRole } from '@/generated/prisma/client';

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
  return workspaceInviteQueries.byId(id);
}

/**
 * Find invite by token
 */
export async function findInviteByToken(token: string) {
  return workspaceInviteQueries.findFirst({
    where: {
      token,
    },
  });
}

/**
 * Create invite
 */
export async function createInvite(data: CreateInput<'WorkspaceInvite'>) {
  const payload: CreateInput<'WorkspaceInvite'> = {
    ...data,
    email: data.email.toLowerCase(),
    token: data.token ?? generateInviteToken(),
  };

  return workspaceInviteCrud.create(payload);
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
  return workspaceInviteCrud.create({
    workspaceId: params.workspaceId,
    email: params.email.toLowerCase(),
    invitedById: params.invitedById ?? undefined,
    role: params.role ?? WorkspaceRole.MEMBER,
    token: generateInviteToken(),
    expiresAt: params.expiresAt ?? undefined,
  });
}

/**
 * Update invite
 */
export async function updateInvite(
  id: string,
  data: UpdateInput<'WorkspaceInvite'>,
) {
  return workspaceInviteCrud.update(id, data);
}

/**
 * Accept invite
 */
export async function acceptInvite(id: string) {
  return workspaceInviteCrud.update(id, {
    status: 'accepted',
  });
}

/**
 * Revoke invite
 */
export async function revokeInvite(id: string) {
  return workspaceInviteCrud.update(id, {
    status: 'revoked',
  });
}

/**
 * Expire invite
 */
export async function expireInvite(id: string) {
  return workspaceInviteCrud.update(id, {
    status: 'expired',
  });
}

/**
 * Delete invite
 */
export async function deleteInvite(id: string) {
  return workspaceInviteCrud.delete(id);
}

/**
 * List workspace invites
 */
export async function listWorkspaceInvites(workspaceId: string) {
  return workspaceInviteQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Check if invite expired
 */
export function isInviteExpired(invite: { expiresAt?: Date | null }) {
  if (!invite.expiresAt) return false;

  return new Date() > invite.expiresAt;
}

/**
 * Validate invite token
 */
export async function validateInviteToken(token: string) {
  const invite = await findInviteByToken(token);

  if (!invite) {
    return null;
  }

  if (invite.status !== 'pending') {
    return null;
  }

  if (isInviteExpired(invite)) {
    return null;
  }

  return invite;
}
