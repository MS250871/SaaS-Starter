import { membershipCrud, membershipQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceRole } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get membership by ID
 */
export async function getMembershipById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID is required');

  const membership = await membershipQueries.byId(id);
  if (!membership) throwError(ERR.NOT_FOUND, 'Membership not found');

  return membership;
}

/**
 * Find membership
 */
export async function findMembership(workspaceId: string, identityId: string) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identityId required');
  }

  return membershipQueries.findFirst({
    where: { workspaceId, identityId },
  });
}

/**
 * Create membership
 */
export async function createMembership(data: CreateInput<'Membership'>) {
  if (!data?.workspaceId || !data?.identityId) {
    throwError(ERR.INVALID_INPUT, 'Invalid membership data');
  }

  const existing = await findMembership(data.workspaceId, data.identityId);

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Membership already exists');
  }

  try {
    return await membershipCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create membership', undefined, e);
  }
}

/**
 * Create workspace membership
 */
export async function createWorkspaceMembership(params: {
  workspaceId: string;
  identityId: string;
  role?: WorkspaceRole;
}) {
  return createMembership({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    role: params.role ?? WorkspaceRole.STAFF,
  });
}

/**
 * Update membership
 */
export async function updateMembership(
  id: string,
  data: UpdateInput<'Membership'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID is required');

  try {
    return await membershipCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update membership', undefined, e);
  }
}

/**
 * Change role
 */
export async function updateMembershipRole(id: string, role: WorkspaceRole) {
  if (!id || !role) {
    throwError(ERR.INVALID_INPUT, 'id and role required');
  }

  return updateMembership(id, { role });
}

/**
 * Activate membership
 */
export async function activateMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  return updateMembership(id, { isActive: true });
}

/**
 * Deactivate membership
 */
export async function deactivateMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  return updateMembership(id, { isActive: false });
}

/**
 * Delete membership
 */
export async function deleteMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  try {
    return await membershipCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete membership', undefined, e);
  }
}

/**
 * List workspace memberships
 */
export async function listWorkspaceMemberships(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  return membershipQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * List identity memberships
 */
export async function listIdentityMemberships(identityId: string) {
  if (!identityId) throwError(ERR.INVALID_INPUT, 'identityId required');

  return membershipQueries.many({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check membership
 */
export async function isIdentityMemberOfWorkspace(
  workspaceId: string,
  identityId: string,
) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identityId required');
  }

  return membershipQueries.exists({
    workspaceId,
    identityId,
    isActive: true,
  });
}
