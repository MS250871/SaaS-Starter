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

import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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

export async function getPermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Permission ID is required');

  const permission = await permissionQueries.byId(id);
  if (!permission) throwError(ERR.NOT_FOUND, 'Permission not found');

  return permission;
}

export async function findPermissionByKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, 'Permission key is required');

  return permissionQueries.findFirst({
    where: { key, isActive: true },
  });
}

export async function listPermissions() {
  return permissionQueries.many({
    where: { isActive: true },
    orderBy: { entity: 'asc' },
  });
}

export async function listPermissionsByEntity(entity: string) {
  if (!entity) throwError(ERR.INVALID_INPUT, 'Entity is required');

  return permissionQueries.many({
    where: { entity, isActive: true },
    orderBy: { key: 'asc' },
  });
}

export async function createPermission(data: CreateInput<'Permission'>) {
  if (!data?.key) throwError(ERR.INVALID_INPUT, 'Permission key is required');

  const existing = await permissionQueries.findFirst({
    where: { key: data.key },
  });

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Permission key already exists');
  }

  try {
    return await permissionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create permission', undefined, e);
  }
}

export async function updatePermission(
  id: string,
  data: UpdateInput<'Permission'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Permission ID is required');

  try {
    return await permissionCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update permission', undefined, e);
  }
}

export async function deletePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Permission ID is required');

  try {
    return await permissionCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete permission', undefined, e);
  }
}

/* -------------------------------------------------------------------------- */
/*                           ROLE PERMISSIONS                                 */
/* -------------------------------------------------------------------------- */

export async function getRolePermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'RolePermission ID is required');

  const rp = await rolePermissionQueries.byId(id);
  if (!rp) throwError(ERR.NOT_FOUND, 'Role permission not found');

  return rp;
}

export async function createRolePermission(data: RolePermissionInput) {
  if (!data.permissionId) {
    throwError(ERR.INVALID_INPUT, 'permissionId is required');
  }

  if (!data.workspaceRole && !data.platformRole) {
    throwError(
      ERR.INVALID_INPUT,
      'Either workspaceRole or platformRole required',
    );
  }

  try {
    return await rolePermissionCrud.create({ ...data });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create role permission', undefined, e);
  }
}

export async function deleteRolePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'RolePermission ID is required');

  try {
    return await rolePermissionCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete role permission', undefined, e);
  }
}

export async function listRolePermissionsByWorkspaceRole(
  workspaceRole: WorkspaceRole,
) {
  if (!workspaceRole) {
    throwError(ERR.INVALID_INPUT, 'workspaceRole is required');
  }

  return rolePermissionQueries.many({
    where: { workspaceRole },
    include: { permission: true },
  });
}

export async function listRolePermissionsByPlatformRole(
  platformRole: PlatformRole,
) {
  if (!platformRole) {
    throwError(ERR.INVALID_INPUT, 'platformRole is required');
  }

  return rolePermissionQueries.many({
    where: { platformRole },
    include: { permission: true },
  });
}

export async function clearWorkspaceRolePermissions(
  workspaceRole: WorkspaceRole,
) {
  if (!workspaceRole) {
    throwError(ERR.INVALID_INPUT, 'workspaceRole is required');
  }

  return rolePermissionCrud.delegate.deleteMany?.({
    where: { workspaceRole },
  });
}

export async function clearPlatformRolePermissions(platformRole: PlatformRole) {
  if (!platformRole) {
    throwError(ERR.INVALID_INPUT, 'platformRole is required');
  }

  return rolePermissionCrud.delegate.deleteMany?.({
    where: { platformRole },
  });
}

/* -------------------------------------------------------------------------- */
/*                     WORKSPACE ROLE PERMISSIONS                             */
/* -------------------------------------------------------------------------- */

export async function getWorkspaceRolePermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'ID is required');

  const rec = await workspaceRolePermissionQueries.byId(id);
  if (!rec) throwError(ERR.NOT_FOUND, 'Workspace role permission not found');

  return rec;
}

export async function createWorkspaceRolePermission(
  data: WorkspaceRolePermissionInput,
) {
  if (!data.workspaceId || !data.workspaceRole || !data.permissionId) {
    throwError(ERR.INVALID_INPUT, 'Invalid workspace role permission data');
  }

  try {
    return await workspaceRolePermissionCrud.create({
      workspaceId: data.workspaceId,
      workspaceRole: data.workspaceRole,
      permissionId: data.permissionId,
      isAllowed: data.isAllowed ?? true,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create workspace role permission',
      undefined,
      e,
    );
  }
}

export async function updateWorkspaceRolePermission(
  id: string,
  data: UpdateInput<'WorkspaceRolePermission'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'ID is required');

  try {
    return await workspaceRolePermissionCrud.update(id, data);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to update workspace role permission',
      undefined,
      e,
    );
  }
}

export async function deleteWorkspaceRolePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'ID is required');

  try {
    return await workspaceRolePermissionCrud.delete(id);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to delete workspace role permission',
      undefined,
      e,
    );
  }
}

export async function listWorkspaceRolePermissions(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
) {
  if (!workspaceId || !workspaceRole) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and workspaceRole required');
  }

  return workspaceRolePermissionQueries.many({
    where: { workspaceId, workspaceRole },
    include: { permission: true },
  });
}

export async function clearWorkspaceRolePermissionOverrides(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
) {
  if (!workspaceId || !workspaceRole) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and workspaceRole required');
  }

  return workspaceRolePermissionCrud.delegate.deleteMany?.({
    where: { workspaceId, workspaceRole },
  });
}

/* -------------------------------------------------------------------------- */
/*                           USER PERMISSIONS                                 */
/* -------------------------------------------------------------------------- */

export async function grantPermission(data: CreateInput<'UserPermission'>) {
  if (!data?.identityId || !data?.permissionId) {
    throwError(ERR.INVALID_INPUT, 'Invalid user permission data');
  }

  try {
    return await userPermissionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to grant permission', undefined, e);
  }
}

export async function grantIdentityPermission(
  params: GrantIdentityPermissionParams,
) {
  if (!params.identityId || !params.permissionId) {
    throwError(ERR.INVALID_INPUT, 'Invalid grant params');
  }

  try {
    return await userPermissionCrud.create({
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
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to grant permission', undefined, e);
  }
}

export async function denyIdentityPermission(params: {
  identityId: string;
  permissionId: string;
  workspaceId?: string | null;
  grantedById?: string | null;
}) {
  if (!params.identityId || !params.permissionId) {
    throwError(ERR.INVALID_INPUT, 'Invalid deny params');
  }

  try {
    return await userPermissionCrud.create({
      identityId: params.identityId,
      permissionId: params.permissionId,
      workspaceId: params.workspaceId ?? undefined,
      grantedById: params.grantedById ?? undefined,
      source: PermissionSource.MANUAL,
      isActive: true,
      effect: PermissionEffect.DENY,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to deny permission', undefined, e);
  }
}

export async function revokePermission(id: string, revokedById?: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Permission ID is required');

  try {
    return await userPermissionCrud.update(id, {
      isActive: false,
      revokedById: revokedById ?? undefined,
      revokedAt: new Date(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to revoke permission', undefined, e);
  }
}

export async function getUserPermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'ID is required');

  const perm = await userPermissionQueries.byId(id);
  if (!perm) throwError(ERR.NOT_FOUND, 'User permission not found');

  return perm;
}

export async function listIdentityPermissions(identityId: string) {
  if (!identityId) throwError(ERR.INVALID_INPUT, 'identityId required');

  return userPermissionQueries.many({
    where: { identityId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { permission: true },
  });
}

export async function listWorkspaceIdentityPermissions(
  workspaceId: string,
  identityId: string,
) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identityId required');
  }

  return userPermissionQueries.many({
    where: { identityId, workspaceId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { permission: true },
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

    if (!up.isActive) continue;
    if (up.revokedAt) continue;
    if (up.expiresAt && up.expiresAt < now) continue;

    if (up.effect === PermissionEffect.DENY) {
      params.permissions.delete(key);
      continue;
    }

    if (up.effect === PermissionEffect.ALLOW) {
      params.permissions.add(key);
    }
  }

  return params.permissions;
}

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

export async function identityHasPermission(params: {
  identityId: string;
  permissionKey: string;
  workspaceId?: string | null;
}) {
  if (!params.identityId || !params.permissionKey) {
    throwError(ERR.INVALID_INPUT, 'Invalid permission check params');
  }

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
    throwError(ERR.FORBIDDEN, `Permission denied: ${required}`);
  }
}
