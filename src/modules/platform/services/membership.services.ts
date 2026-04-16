import {
  platformMembershipCrud,
  platformMembershipQueries,
} from '@/modules/platform/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { PlatformRole } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get platform membership by ID
 */
export async function getPlatformMembershipById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID is required');

  const membership = await platformMembershipQueries.byId(id);
  if (!membership) throwError(ERR.NOT_FOUND, 'Membership not found');

  return membership;
}

/**
 * Find platform membership (identity + role)
 */
export async function findPlatformMembership(
  identityId: string,
  role: PlatformRole,
) {
  if (!identityId || !role) {
    throwError(ERR.INVALID_INPUT, 'identityId and role required');
  }

  return platformMembershipQueries.findFirst({
    where: { identityId, role },
  });
}

/**
 * Find all memberships for identity
 */
export async function listIdentityPlatformMemberships(identityId: string) {
  if (!identityId) throwError(ERR.INVALID_INPUT, 'identityId required');

  return platformMembershipQueries.many({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all platform roles for identity
 */

export async function getPlatformRoles(identityId: string) {
  const memberships = await listIdentityPlatformMemberships(identityId);

  const roles = memberships
    .filter((m: (typeof memberships)[number]) => m.isActive)
    .map((m: (typeof memberships)[number]) => m.role);

  return Array.from(new Set(roles));
}

/**
 * Create platform membership
 */
export async function createPlatformMembership(
  data: CreateInput<'PlatformMembership'>,
) {
  if (!data?.identityId || !data?.role) {
    throwError(ERR.INVALID_INPUT, 'Invalid membership data');
  }

  const existing = await findPlatformMembership(data.identityId, data.role);

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Platform membership already exists');
  }

  try {
    return await platformMembershipCrud.create(data);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create platform membership',
      undefined,
      e,
    );
  }
}

/**
 * Create platform membership (typed helper)
 */
export async function createPlatformMembershipEntry(params: {
  identityId: string;
  role?: PlatformRole;
}) {
  return createPlatformMembership({
    identityId: params.identityId,
    role: params.role ?? PlatformRole.PLATFORM_STAFF,
  });
}

/**
 * Update membership
 */
export async function updatePlatformMembership(
  id: string,
  data: UpdateInput<'PlatformMembership'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID is required');

  try {
    return await platformMembershipCrud.update(id, data);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to update platform membership',
      undefined,
      e,
    );
  }
}

/**
 * Change role (delete old + create new OR update if allowed)
 */
export async function updatePlatformMembershipRole(
  id: string,
  role: PlatformRole,
) {
  if (!id || !role) {
    throwError(ERR.INVALID_INPUT, 'id and role required');
  }

  return updatePlatformMembership(id, { role });
}

/**
 * Activate membership
 */
export async function activatePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  return updatePlatformMembership(id, { isActive: true });
}

/**
 * Deactivate membership
 */
export async function deactivatePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  return updatePlatformMembership(id, { isActive: false });
}

/**
 * Delete membership
 */
export async function deletePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Membership ID required');

  try {
    return await platformMembershipCrud.delete(id);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to delete platform membership',
      undefined,
      e,
    );
  }
}

/**
 * List all platform memberships
 */
export async function listPlatformMemberships() {
  return platformMembershipQueries.many({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if identity has a platform role
 */
export async function hasPlatformRole(identityId: string, role: PlatformRole) {
  if (!identityId || !role) {
    throwError(ERR.INVALID_INPUT, 'identityId and role required');
  }

  return platformMembershipQueries.exists({
    identityId,
    role,
    isActive: true,
  });
}

/**
 * Check if identity has ANY platform access
 */
export async function isPlatformUser(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'identityId required');
  }

  return platformMembershipQueries.exists({
    identityId,
    isActive: true,
  });
}

export async function getPlatformAccessContext(identityId: string): Promise<{
  roles: PlatformRole[];
  memberships: Awaited<ReturnType<typeof listIdentityPlatformMemberships>>;
  hasAccess: boolean;
}> {
  const memberships = await listIdentityPlatformMemberships(identityId);

  const active = memberships.filter(
    (m: (typeof memberships)[number]) => m.isActive,
  );

  return {
    roles: Array.from(
      new Set(active.map((m: (typeof active)[number]) => m.role)),
    ),
    memberships: active,
    hasAccess: active.length > 0,
  };
}
