import {
  permissionCrud,
  permissionQueries,
  rolePermissionCrud,
  rolePermissionQueries,
  workspaceRolePermissionCrud,
  workspaceRolePermissionQueries,
  userPermissionCrud,
  userPermissionQueries,
} from "@/modules/permissions/db"

import type { CreateInput, UpdateInput } from "@/lib/crud/prisma-types"
import {
  PermissionSource,
  PermissionEffect,
} from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

type RolePermissionInput = {
  permissionId: string
  roleDefinitionId: string
}

type WorkspaceRolePermissionInput = {
  workspaceId: string
  roleDefinitionId: string
  permissionId: string
  isAllowed?: boolean
}

type GrantIdentityPermissionParams = {
  identityId: string
  permissionId: string
  workspaceId?: string | null
  grantedById?: string | null
  expiresAt?: Date | null
  source?: PermissionSource
}

type ResolvePermissionsParams = {
  identityId?: string
  workspaceId?: string | null
  workspaceRoleDefinitionId?: string | null
  platformRoleDefinitionIds?: string[] | null
}

export type WorkspaceRolePermissionOverride = Prisma.WorkspaceRolePermissionGetPayload<{
  include: { permission: true }
}>

export type WorkspaceRolePermissionWithPermission = Prisma.WorkspaceRolePermissionGetPayload<{
  include: { permission: true }
}>

export type IdentityPermissionWithPermission = Prisma.UserPermissionGetPayload<{
  include: { permission: true }
}>

export type RolePermissionWithPermission = Prisma.RolePermissionGetPayload<{
  include: { permission: true }
}>

export type WorkspaceUserPermissionOverrideDetailed = Prisma.UserPermissionGetPayload<{
  include: {
    permission: true
    identity: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
      }
    }
    grantedBy: {
      select: {
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

export type WorkspaceUserPermissionOverride = Prisma.UserPermissionGetPayload<{
  include: {
    permission: true
    identity: true
  }
}>

export async function getPermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Permission ID is required")

  const permission = await permissionQueries.findUnique({
    where: { id },
  })
  if (!permission) throwError(ERR.NOT_FOUND, "Permission not found")

  return permission
}

export async function findPermissionByKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, "Permission key is required")

  return permissionQueries.findFirst({
    where: { key, isActive: true },
  })
}

export async function listPermissions() {
  return permissionQueries.many({
    where: { isActive: true },
    orderBy: { entity: "asc" },
  })
}

export async function listPermissionsByEntity(entity: string) {
  if (!entity) throwError(ERR.INVALID_INPUT, "Entity is required")

  return permissionQueries.many({
    where: { entity, isActive: true },
    orderBy: { key: "asc" },
  })
}

export async function createPermission(data: CreateInput<"Permission">) {
  if (!data?.key) throwError(ERR.INVALID_INPUT, "Permission key is required")

  const existing = await permissionQueries.findFirst({
    where: { key: data.key },
  })

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, "Permission key already exists")
  }

  try {
    return await permissionCrud.create(data)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create permission", undefined, e)
  }
}

export async function updatePermission(
  id: string,
  data: UpdateInput<"Permission">,
) {
  if (!id) throwError(ERR.INVALID_INPUT, "Permission ID is required")

  try {
    return await permissionCrud.update(id, data)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to update permission", undefined, e)
  }
}

export async function deletePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Permission ID is required")

  try {
    return await permissionCrud.delete(id)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to delete permission", undefined, e)
  }
}

export async function getRolePermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "RolePermission ID is required")

  const rolePermission = await rolePermissionQueries.findUnique({
    where: { id },
  })
  if (!rolePermission) throwError(ERR.NOT_FOUND, "Role permission not found")

  return rolePermission
}

export async function createRolePermission(data: RolePermissionInput) {
  if (!data.permissionId || !data.roleDefinitionId) {
    throwError(ERR.INVALID_INPUT, "roleDefinitionId and permissionId are required")
  }

  try {
    return await rolePermissionCrud.create({
      roleDefinitionId: data.roleDefinitionId,
      permissionId: data.permissionId,
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create role permission", undefined, e)
  }
}

export async function deleteRolePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "RolePermission ID is required")

  try {
    return await rolePermissionCrud.delete(id)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to delete role permission", undefined, e)
  }
}

export async function listRolePermissionsByRoleDefinition(
  roleDefinitionId: string,
) {
  if (!roleDefinitionId) {
    throwError(ERR.INVALID_INPUT, "roleDefinitionId is required")
  }

  return rolePermissionQueries.many({
    where: { roleDefinitionId },
    include: { permission: true },
  })
}

export async function clearRolePermissionsByRoleDefinition(
  roleDefinitionId: string,
) {
  if (!roleDefinitionId) {
    throwError(ERR.INVALID_INPUT, "roleDefinitionId is required")
  }

  return rolePermissionCrud.delegate.deleteMany?.({
    where: { roleDefinitionId },
  })
}

export async function getWorkspaceRolePermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "ID is required")

  const record = await workspaceRolePermissionQueries.findUnique({
    where: { id },
  })
  if (!record) throwError(ERR.NOT_FOUND, "Workspace role permission not found")

  return record
}

export async function createWorkspaceRolePermission(
  data: WorkspaceRolePermissionInput,
) {
  if (!data.workspaceId || !data.roleDefinitionId || !data.permissionId) {
    throwError(ERR.INVALID_INPUT, "Invalid workspace role permission data")
  }

  try {
    return await workspaceRolePermissionCrud.create({
      workspaceId: data.workspaceId,
      roleDefinitionId: data.roleDefinitionId,
      permissionId: data.permissionId,
      isAllowed: data.isAllowed ?? true,
    } as never)
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to create workspace role permission",
      undefined,
      e,
    )
  }
}

export async function updateWorkspaceRolePermission(
  id: string,
  data: UpdateInput<"WorkspaceRolePermission">,
) {
  if (!id) throwError(ERR.INVALID_INPUT, "ID is required")

  try {
    return await workspaceRolePermissionCrud.update(id, data)
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to update workspace role permission",
      undefined,
      e,
    )
  }
}

export async function deleteWorkspaceRolePermission(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "ID is required")

  try {
    return await workspaceRolePermissionCrud.delete(id)
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to delete workspace role permission",
      undefined,
      e,
    )
  }
}

export async function listWorkspaceRolePermissions(
  workspaceId: string,
  roleDefinitionId: string,
): Promise<WorkspaceRolePermissionWithPermission[]> {
  if (!workspaceId || !roleDefinitionId) {
    throwError(
      ERR.INVALID_INPUT,
      "workspaceId and roleDefinitionId are required",
    )
  }

  const overrides = await workspaceRolePermissionQueries.many({
    where: { workspaceId, roleDefinitionId },
    include: { permission: true },
  })

  return overrides as unknown as WorkspaceRolePermissionWithPermission[]
}

export async function findWorkspaceRolePermissionOverride(params: {
  workspaceId: string
  roleDefinitionId: string
  permissionId: string
}) {
  if (!params.workspaceId || !params.roleDefinitionId || !params.permissionId) {
    throwError(
      ERR.INVALID_INPUT,
      "workspaceId, roleDefinitionId, and permissionId are required",
    )
  }

  return workspaceRolePermissionQueries.findFirst({
    where: {
      workspaceId: params.workspaceId,
      roleDefinitionId: params.roleDefinitionId,
      permissionId: params.permissionId,
    },
  })
}

export async function setWorkspaceRolePermissionOverride(params: {
  workspaceId: string
  roleDefinitionId: string
  permissionId: string
  isAllowed: boolean
}) {
  const existing = await findWorkspaceRolePermissionOverride(params)

  if (existing) {
    return updateWorkspaceRolePermission(existing.id, {
      isAllowed: params.isAllowed,
    })
  }

  return createWorkspaceRolePermission(params)
}

export async function listWorkspaceRolePermissionOverrides(
  workspaceId: string,
): Promise<WorkspaceRolePermissionOverride[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "Workspace ID is required")
  }

  const overrides = await workspaceRolePermissionQueries.many({
    where: { workspaceId },
    include: { permission: true },
  })

  return overrides as WorkspaceRolePermissionOverride[]
}

export async function clearWorkspaceRolePermissionOverride(params: {
  workspaceId: string
  roleDefinitionId: string
  permissionId: string
}) {
  const existing = await findWorkspaceRolePermissionOverride(params)

  if (!existing) {
    return null
  }

  return deleteWorkspaceRolePermission(existing.id)
}

export async function clearWorkspaceRolePermissionOverrides(
  workspaceId: string,
  roleDefinitionId: string,
) {
  if (!workspaceId || !roleDefinitionId) {
    throwError(
      ERR.INVALID_INPUT,
      "workspaceId and roleDefinitionId are required",
    )
  }

  return workspaceRolePermissionCrud.delegate.deleteMany?.({
    where: { workspaceId, roleDefinitionId },
  })
}

export async function grantPermission(data: CreateInput<"UserPermission">) {
  if (!data?.identityId || !data?.permissionId) {
    throwError(ERR.INVALID_INPUT, "Invalid user permission data")
  }

  try {
    return await userPermissionCrud.create(data)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to grant permission", undefined, e)
  }
}

export async function grantIdentityPermission(
  params: GrantIdentityPermissionParams,
) {
  if (!params.identityId || !params.permissionId) {
    throwError(ERR.INVALID_INPUT, "Invalid grant params")
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
    })
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to grant permission", undefined, e)
  }
}

export async function denyIdentityPermission(params: {
  identityId: string
  permissionId: string
  workspaceId?: string | null
  grantedById?: string | null
}) {
  if (!params.identityId || !params.permissionId) {
    throwError(ERR.INVALID_INPUT, "Invalid deny params")
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
    })
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to deny permission", undefined, e)
  }
}

export async function revokePermission(id: string, revokedById?: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Permission ID is required")

  try {
    return await userPermissionCrud.update(id, {
      isActive: false,
      revokedById: revokedById ?? undefined,
      revokedAt: new Date(),
    })
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to revoke permission", undefined, e)
  }
}

export async function getUserPermissionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "ID is required")

  const permission = await userPermissionQueries.findUnique({
    where: { id },
  })
  if (!permission) throwError(ERR.NOT_FOUND, "User permission not found")

  return permission
}

export async function listIdentityPermissions(
  identityId: string,
): Promise<IdentityPermissionWithPermission[]> {
  if (!identityId) throwError(ERR.INVALID_INPUT, "identityId required")

  const permissions = await userPermissionQueries.many({
    where: { identityId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { permission: true },
  })

  return permissions as unknown as IdentityPermissionWithPermission[]
}

export async function listWorkspaceIdentityPermissions(
  workspaceId: string,
  identityId: string,
): Promise<IdentityPermissionWithPermission[]> {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, "workspaceId and identityId required")
  }

  const permissions = await userPermissionQueries.many({
    where: { identityId, workspaceId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { permission: true },
  })

  return permissions as unknown as IdentityPermissionWithPermission[]
}

export async function getWorkspaceUserPermissionOverride(
  workspaceId: string,
  userPermissionId: string,
): Promise<WorkspaceUserPermissionOverride> {
  if (!workspaceId || !userPermissionId) {
    throwError(ERR.INVALID_INPUT, "workspaceId and userPermissionId are required")
  }

  const override = await userPermissionQueries.findFirst({
    where: {
      id: userPermissionId,
      workspaceId,
    },
    include: {
      permission: true,
      identity: true,
    },
  })

  if (!override) {
    throwError(ERR.NOT_FOUND, "Workspace permission override not found")
  }

  return override as unknown as WorkspaceUserPermissionOverride
}

export async function findLatestManualWorkspaceUserPermissionOverride(params: {
  workspaceId: string
  identityId: string
  permissionId: string
}) {
  if (!params.workspaceId || !params.identityId || !params.permissionId) {
    throwError(
      ERR.INVALID_INPUT,
      "workspaceId, identityId, and permissionId are required",
    )
  }

  return userPermissionQueries.findFirst({
    where: {
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      permissionId: params.permissionId,
      isActive: true,
      source: PermissionSource.MANUAL,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function upsertWorkspaceUserPermissionOverride(params: {
  workspaceId: string
  identityId: string
  permissionId: string
  effect: "ALLOW" | "DENY"
  grantedById?: string
}) {
  const existing = await findLatestManualWorkspaceUserPermissionOverride({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    permissionId: params.permissionId,
  })

  if (existing) {
    return userPermissionCrud.update(existing.id, {
      effect: params.effect,
      grantedById: params.grantedById ?? null,
      revokedById: null,
      revokedAt: null,
      isActive: true,
      isTemporary: false,
      expiresAt: null,
    })
  }

  return userPermissionCrud.create({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    permissionId: params.permissionId,
    grantedById: params.grantedById,
    source: PermissionSource.MANUAL,
    isActive: true,
    effect: params.effect,
  })
}

export async function listWorkspaceUserPermissionOverridesDetailed(
  workspaceId: string,
): Promise<WorkspaceUserPermissionOverrideDetailed[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "Workspace ID is required")
  }

  const overrides = await userPermissionQueries.many({
    where: {
      workspaceId,
      isActive: true,
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      permission: true,
      identity: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      grantedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  return overrides as WorkspaceUserPermissionOverrideDetailed[]
}

export async function getBaseRolePermissionKeys(params: {
  workspaceRoleDefinitionId?: string | null
  platformRoleDefinitionIds?: string[] | null
}) {
  const keys = new Set<string>()
  const roleDefinitionIds = [
    params.workspaceRoleDefinitionId ?? undefined,
    ...(params.platformRoleDefinitionIds ?? []),
  ].filter((value): value is string => Boolean(value))

  if (roleDefinitionIds.length === 0) {
    return keys
  }

  const rolePermissions = (await rolePermissionQueries.many({
    where: {
      roleDefinitionId: {
        in: roleDefinitionIds,
      },
    },
    include: { permission: true },
  })) as unknown as RolePermissionWithPermission[]

  for (const permission of rolePermissions) {
    if (permission.permission?.key) {
      keys.add(permission.permission.key)
    }
  }

  return keys
}

export async function applyWorkspaceRoleOverrides(params: {
  workspaceId: string
  roleDefinitionId: string
  basePermissions: Set<string>
}) {
  const overrides = await listWorkspaceRolePermissions(
    params.workspaceId,
    params.roleDefinitionId,
  )

  for (const override of overrides) {
    const key = override.permission?.key
    if (!key) continue

    if (override.isAllowed) {
      params.basePermissions.add(key)
    } else {
      params.basePermissions.delete(key)
    }
  }

  return params.basePermissions
}

export async function applyUserPermissionOverrides(params: {
  identityId: string
  workspaceId?: string | null
  permissions: Set<string>
}) {
  const userPermissions = params.workspaceId
    ? await listWorkspaceIdentityPermissions(
        params.workspaceId,
        params.identityId,
      )
    : await listIdentityPermissions(params.identityId)

  const now = new Date()

  for (const userPermission of userPermissions) {
    const key = userPermission.permission?.key
    if (!key) continue

    if (!userPermission.isActive) continue
    if (userPermission.revokedAt) continue
    if (userPermission.expiresAt && userPermission.expiresAt < now) continue

    if (userPermission.effect === PermissionEffect.DENY) {
      params.permissions.delete(key)
      continue
    }

    if (userPermission.effect === PermissionEffect.ALLOW) {
      params.permissions.add(key)
    }
  }

  return params.permissions
}

export async function resolvePermissions(params: ResolvePermissionsParams) {
  const permissions = await getBaseRolePermissionKeys({
    workspaceRoleDefinitionId: params.workspaceRoleDefinitionId ?? null,
    platformRoleDefinitionIds: params.platformRoleDefinitionIds ?? [],
  })

  if (params.workspaceId && params.workspaceRoleDefinitionId) {
    await applyWorkspaceRoleOverrides({
      workspaceId: params.workspaceId,
      roleDefinitionId: params.workspaceRoleDefinitionId,
      basePermissions: permissions,
    })
  }

  if (params.identityId) {
    await applyUserPermissionOverrides({
      identityId: params.identityId,
      workspaceId: params.workspaceId ?? null,
      permissions,
    })
  }

  return Array.from(permissions)
}

export async function identityHasPermission(params: {
  identityId: string
  permissionKey: string
  workspaceId?: string | null
}) {
  if (!params.identityId || !params.permissionKey) {
    throwError(ERR.INVALID_INPUT, "Invalid permission check params")
  }

  const permission = await findPermissionByKey(params.permissionKey)

  if (!permission) return false

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
      })

  if (!assignment) return false

  if (assignment.revokedAt) return false
  if (assignment.expiresAt && new Date() > assignment.expiresAt) return false

  return true
}

export function hasPermission(permissions: string[], required: string) {
  return permissions.includes(required)
}

export function assertPermission(permissions: string[], required: string) {
  if (!permissions.includes(required)) {
    throwError(ERR.FORBIDDEN, `Permission denied: ${required}`)
  }
}
