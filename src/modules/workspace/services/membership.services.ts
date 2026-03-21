import { membershipCrud, membershipQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceRole } from '@/generated/prisma/client';

/**
 * Get membership by ID
 */
export async function getMembershipById(id: string) {
  return membershipQueries.byId(id);
}

/**
 * Find membership by workspace + identity
 */
export async function findMembership(workspaceId: string, identityId: string) {
  return membershipQueries.findFirst({
    where: {
      workspaceId,
      identityId,
    },
  });
}

/**
 * Create membership
 */
export async function createMembership(data: CreateInput<'Membership'>) {
  return membershipCrud.create(data);
}

/**
 * Create membership for identity in workspace
 */
export async function createWorkspaceMembership(params: {
  workspaceId: string;
  identityId: string;
  role?: WorkspaceRole;
}) {
  return membershipCrud.create({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    role: params.role ?? WorkspaceRole.MEMBER,
  });
}

/**
 * Update membership
 */
export async function updateMembership(
  id: string,
  data: UpdateInput<'Membership'>,
) {
  return membershipCrud.update(id, data);
}

/**
 * Change membership role
 */
export async function updateMembershipRole(id: string, role: WorkspaceRole) {
  return membershipCrud.update(id, {
    role,
  });
}

/**
 * Activate membership
 */
export async function activateMembership(id: string) {
  return membershipCrud.update(id, {
    isActive: true,
  });
}

/**
 * Deactivate membership
 */
export async function deactivateMembership(id: string) {
  return membershipCrud.update(id, {
    isActive: false,
  });
}

/**
 * Delete membership
 */
export async function deleteMembership(id: string) {
  return membershipCrud.delete(id);
}

/**
 * List memberships for workspace
 */
export async function listWorkspaceMemberships(workspaceId: string) {
  return membershipQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List memberships for identity
 */
export async function listIdentityMemberships(identityId: string) {
  return membershipQueries.many({
    where: {
      identityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Check if identity belongs to workspace
 */
export async function isIdentityMemberOfWorkspace(
  workspaceId: string,
  identityId: string,
) {
  return membershipQueries.exists({
    workspaceId,
    identityId,
    isActive: true,
  });
}
