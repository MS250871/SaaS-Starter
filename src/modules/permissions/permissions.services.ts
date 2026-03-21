import {
  permissionCrud,
  permissionQueries,
  rolePermissionCrud,
  rolePermissionQueries,
  workspaceRolePermissionCrud,
  workspaceRolePermissionQueries,
  userPermissionCrud,
  userPermissionQueries,
} from '@/modules/permissions/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import {
  PermissionSource,
  type PlatformRole,
  type WorkspaceRole,
  PermissionEffect,
} from '@/generated/prisma/client';

/* -------------------------------------------------------------------------- */
/*                              SHARED TYPES                                  */
/* -------------------------------------------------------------------------- */

type PermissionRecord = {
  id: string;
  key: string;
  entity?: string;
  isActive?: boolean;
};

type RolePermissionInput = {
  permissionId: string;
  workspaceRole?: WorkspaceRole;
  platformRole?: PlatformRole;
};

type WorkspaceRolePermissionInput = {
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  permissionId: string;
  isAllowed?: boolean;
};

type GrantIdentityPermissionParams = {
  identityId: string;
  permissionId: string;
  workspaceId?: string | null;
  grantedById?: string | null;
  expiresAt?: Date | null;
  source?: PermissionSource;
};

type ResolvePermissionsParams = {
  identityId?: string;
  workspaceId?: string | null;
  workspaceRole?: WorkspaceRole | null;
  platformRole?: PlatformRole | null;
};

/* -------------------------------------------------------------------------- */
/*                        PERMISSION DEFINITIONS                               */
/* -------------------------------------------------------------------------- */

/**
 * Get permission definition by ID
 */
export async function getPermissionById(id: string) {
  return permissionQueries.byId(id);
}

/**
 * Find permission by key
 * Global permissions only — no workspace scoping here.
 */
export async function findPermissionByKey(key: string) {
  return permissionQueries.findFirst({
    where: {
      key,
      isActive: true,
    },
  });
}

/**
 * List all permissions
 */
export async function listPermissions() {
  return permissionQueries.many({
    where: {
      isActive: true,
    },
    orderBy: {
      entity: 'asc',
    },
  });
}

/**
 * List permissions by entity/module
 */
export async function listPermissionsByEntity(entity: string) {
  return permissionQueries.many({
    where: {
      entity,
      isActive: true,
    },
    orderBy: {
      key: 'asc',
    },
  });
}

/**
 * Create permission definition
 */
export async function createPermission(data: CreateInput<'Permission'>) {
  return permissionCrud.create(data);
}

/**
 * Update permission definition
 */
export async function updatePermission(
  id: string,
  data: UpdateInput<'Permission'>,
) {
  return permissionCrud.update(id, data);
}

/**
 * Delete permission definition
 */
export async function deletePermission(id: string) {
  return permissionCrud.delete(id);
}

/* -------------------------------------------------------------------------- */
/*                           ROLE PERMISSIONS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Get role permission by ID
 */
export async function getRolePermissionById(id: string) {
  return rolePermissionQueries.byId(id);
}

/**
 * Create role permission
 */
export async function createRolePermission(data: RolePermissionInput) {
  return rolePermissionCrud.create({
    ...data,
  });
}

/**
 * Delete role permission
 */
export async function deleteRolePermission(id: string) {
  return rolePermissionCrud.delete(id);
}

/**
 * List all permissions for a workspace role
 */
export async function listRolePermissionsByWorkspaceRole(
  workspaceRole: WorkspaceRole,
) {
  return rolePermissionQueries.many({
    where: {
      workspaceRole,
    },
    include: {
      permission: true,
    },
  });
}

/**
 * List all permissions for a platform role
 */
export async function listRolePermissionsByPlatformRole(
  platformRole: PlatformRole,
) {
  return rolePermissionQueries.many({
    where: {
      platformRole,
    },
    include: {
      permission: true,
    },
  });
}

/**
 * Remove all role-permission mappings for a workspace role
 * Useful for admin panel reset / replacement flows.
 */
export async function clearWorkspaceRolePermissions(
  workspaceRole: WorkspaceRole,
) {
  return rolePermissionCrud.delegate.deleteMany?.({
    where: {
      workspaceRole,
    },
  });
}

/**
 * Remove all role-permission mappings for a platform role
 */
export async function clearPlatformRolePermissions(platformRole: PlatformRole) {
  return rolePermissionCrud.delegate.deleteMany?.({
    where: {
      platformRole,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                     WORKSPACE ROLE PERMISSIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Get workspace role permission by ID
 */
export async function getWorkspaceRolePermissionById(id: string) {
  return workspaceRolePermissionQueries.byId(id);
}

/**
 * Create workspace role permission override
 */
export async function createWorkspaceRolePermission(
  data: WorkspaceRolePermissionInput,
) {
  return workspaceRolePermissionCrud.create({
    workspaceId: data.workspaceId,
    workspaceRole: data.workspaceRole,
    permissionId: data.permissionId,
    isAllowed: data.isAllowed ?? true,
  });
}

/**
 * Update workspace role permission override
 */
export async function updateWorkspaceRolePermission(
  id: string,
  data: UpdateInput<'WorkspaceRolePermission'>,
) {
  return workspaceRolePermissionCrud.update(id, data);
}

/**
 * Delete workspace role permission override
 */
export async function deleteWorkspaceRolePermission(id: string) {
  return workspaceRolePermissionCrud.delete(id);
}

/**
 * List workspace-specific overrides for a role
 */
export async function listWorkspaceRolePermissions(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
) {
  return workspaceRolePermissionQueries.many({
    where: {
      workspaceId,
      workspaceRole,
    },
    include: {
      permission: true,
    },
  });
}

/**
 * Clear all overrides for a workspace role inside a workspace
 */
export async function clearWorkspaceRolePermissionOverrides(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
) {
  return workspaceRolePermissionCrud.delegate.deleteMany?.({
    where: {
      workspaceId,
      workspaceRole,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                           USER PERMISSIONS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Grant permission to identity
 */
export async function grantPermission(data: CreateInput<'UserPermission'>) {
  return userPermissionCrud.create(data);
}

/**
 * Grant permission helper
 */
export async function grantIdentityPermission(
  params: GrantIdentityPermissionParams,
) {
  return userPermissionCrud.create({
    identityId: params.identityId,
    permissionId: params.permissionId,
    workspaceId: params.workspaceId ?? undefined,
    grantedById: params.grantedById ?? undefined,
    source: params.source ?? PermissionSource.MANUAL,
    expiresAt: params.expiresAt ?? undefined,
    isActive: true,
    isTemporary: !!params.expiresAt,
    effect: PermissionEffect.ALLOW,
  });
}

/**
 * Deny permission helper
 */

export async function denyIdentityPermission(params: {
  identityId: string;
  permissionId: string;
  workspaceId?: string | null;
  grantedById?: string | null;
}) {
  return userPermissionCrud.create({
    identityId: params.identityId,
    permissionId: params.permissionId,
    workspaceId: params.workspaceId ?? undefined,
    grantedById: params.grantedById ?? undefined,
    source: PermissionSource.MANUAL,
    isActive: true,
    effect: PermissionEffect.DENY,
  });
}

/**
 * Revoke permission
 */
export async function revokePermission(id: string, revokedById?: string) {
  return userPermissionCrud.update(id, {
    isActive: false,
    revokedById: revokedById ?? undefined,
    revokedAt: new Date(),
  });
}

/**
 * Get user permission assignment
 */
export async function getUserPermissionById(id: string) {
  return userPermissionQueries.byId(id);
}

/**
 * List identity permissions
 */
export async function listIdentityPermissions(identityId: string) {
  return userPermissionQueries.many({
    where: {
      identityId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      permission: true,
    },
  });
}

/**
 * List workspace permissions for identity
 */
export async function listWorkspaceIdentityPermissions(
  workspaceId: string,
  identityId: string,
) {
  return userPermissionQueries.many({
    where: {
      identityId,
      workspaceId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      permission: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                          RESOLUTION HELPERS                                */
/* -------------------------------------------------------------------------- */

function toPermissionKeySet(records: Array<{ permission?: { key: string } }>) {
  return new Set(
    records
      .map((record) => record.permission?.key)
      .filter((key): key is string => Boolean(key)),
  );
}

/**
 * Base role permissions from global role defaults.
 * Supports one or both of platformRole / workspaceRole.
 */
export async function getBaseRolePermissionKeys(params: {
  workspaceRole?: WorkspaceRole | null;
  platformRole?: PlatformRole | null;
}) {
  const keys = new Set<string>();

  if (params.workspaceRole) {
    const rolePermissions = await listRolePermissionsByWorkspaceRole(
      params.workspaceRole,
    );
    for (const permission of rolePermissions) {
      if (permission.permission?.key) keys.add(permission.permission.key);
    }
  }

  if (params.platformRole) {
    const rolePermissions = await listRolePermissionsByPlatformRole(
      params.platformRole,
    );
    for (const permission of rolePermissions) {
      if (permission.permission?.key) keys.add(permission.permission.key);
    }
  }

  return keys;
}

/**
 * Workspace-specific role overrides.
 * Adds allowed permissions and removes denied permissions.
 */
export async function applyWorkspaceRoleOverrides(params: {
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  basePermissions: Set<string>;
}) {
  const overrides = await listWorkspaceRolePermissions(
    params.workspaceId,
    params.workspaceRole,
  );

  for (const override of overrides) {
    const key = override.permission?.key;
    if (!key) continue;

    if (override.isAllowed) {
      params.basePermissions.add(key);
    } else {
      params.basePermissions.delete(key);
    }
  }

  return params.basePermissions;
}

/**
 * User-level overrides.
 * Currently this table is grant-oriented, so active rows add permissions.
 * Inactive / revoked rows are ignored.
 */
export async function applyUserPermissionOverrides(params: {
  identityId: string;
  workspaceId?: string | null;
  permissions: Set<string>;
}) {
  const userPermissions = params.workspaceId
    ? await listWorkspaceIdentityPermissions(
        params.workspaceId,
        params.identityId,
      )
    : await listIdentityPermissions(params.identityId);

  const now = new Date();

  for (const up of userPermissions) {
    const key = up.permission?.key;
    if (!key) continue;

    // ❗ skip inactive
    if (!up.isActive) continue;

    // ❗ skip revoked
    if (up.revokedAt) continue;

    // skip expired
    if (up.expiresAt && up.expiresAt < now) continue;

    // 🔴 DENY → remove
    if (up.effect === PermissionEffect.DENY) {
      params.permissions.delete(key);
      continue;
    }

    // 🟢 ALLOW → add
    if (up.effect === PermissionEffect.ALLOW) {
      params.permissions.add(key);
    }
  }

  return params.permissions;
}

/**
 * Resolve effective permissions for an actor.
 * This is the main resolver used at login / session refresh.
 */
export async function resolvePermissions(params: ResolvePermissionsParams) {
  const permissions = await getBaseRolePermissionKeys({
    workspaceRole: params.workspaceRole ?? null,
    platformRole: params.platformRole ?? null,
  });

  if (params.workspaceId && params.workspaceRole) {
    await applyWorkspaceRoleOverrides({
      workspaceId: params.workspaceId,
      workspaceRole: params.workspaceRole,
      basePermissions: permissions,
    });
  }

  if (params.identityId) {
    await applyUserPermissionOverrides({
      identityId: params.identityId,
      workspaceId: params.workspaceId ?? null,
      permissions,
    });
  }

  return Array.from(permissions);
}

/* -------------------------------------------------------------------------- */
/*                               CHECK HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Check if identity has permission via DB.
 * Useful for admin-panel lookups and debugging.
 * Prefer session-based checks at runtime.
 */
export async function identityHasPermission(params: {
  identityId: string;
  permissionKey: string;
  workspaceId?: string | null;
}) {
  const permission = await findPermissionByKey(params.permissionKey);

  if (!permission) return false;

  const assignment = params.workspaceId
    ? await userPermissionQueries.findFirst({
        where: {
          identityId: params.identityId,
          permissionId: permission.id,
          workspaceId: params.workspaceId,
          isActive: true,
        },
      })
    : await userPermissionQueries.findFirst({
        where: {
          identityId: params.identityId,
          permissionId: permission.id,
          workspaceId: null,
          isActive: true,
        },
      });

  if (!assignment) return false;

  if (assignment.revokedAt) return false;
  if (assignment.expiresAt && new Date() > assignment.expiresAt) return false;

  return true;
}

export function hasPermission(permissions: string[], required: string) {
  return permissions.includes(required);
}

export function assertPermission(permissions: string[], required: string) {
  if (!permissions.includes(required)) {
    throw new Error(`Permission denied: ${required}`);
  }
}
