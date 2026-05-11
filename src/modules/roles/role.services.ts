import { roleDefinitionCrud, roleDefinitionQueries } from "@/modules/roles/db"
import type {
  PlatformRoleSystemKey,
  RoleScope,
  RoleSystemKey,
  WorkspaceRoleSystemKey,
} from "@/modules/roles/role.types"
import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

export type RoleAssignmentSnapshot = {
  roleDefinitionId: string
  roleKey: string
  roleSystemKey?: RoleSystemKey | null
}

export async function getRoleDefinitionById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, "Role definition id is required")
  }

  const roleDefinition = await roleDefinitionQueries.byId(id)

  if (!roleDefinition) {
    throwError(ERR.NOT_FOUND, "Role definition not found")
  }

  return roleDefinition
}

export async function getRoleDefinitionByKey(scope: RoleScope, key: string) {
  if (!scope || !key) {
    throwError(ERR.INVALID_INPUT, "Role scope and key are required")
  }

  return roleDefinitionQueries.findFirst({
    where: {
      scope,
      key,
      isActive: true,
    },
  })
}

export async function getSystemRoleDefinition(
  scope: RoleScope,
  systemKey: RoleSystemKey,
) {
  if (!scope || !systemKey) {
    throwError(ERR.INVALID_INPUT, "Role scope and system key are required")
  }

  const roleDefinition = await roleDefinitionQueries.findFirst({
    where: {
      scope,
      systemKey,
      isActive: true,
    },
  })

  if (!roleDefinition) {
    throwError(
      ERR.NOT_FOUND,
      `System role not found for ${scope}:${systemKey}`,
    )
  }

  return roleDefinition
}

export async function listRoleDefinitionsByScope(scope: RoleScope) {
  if (!scope) {
    throwError(ERR.INVALID_INPUT, "Role scope is required")
  }

  return roleDefinitionQueries.many({
    where: {
      scope,
      isActive: true,
    },
    orderBy: [{ hierarchyRank: "desc" }, { name: "asc" }],
  })
}

export async function listAssignableRoleDefinitions(scope: RoleScope) {
  if (!scope) {
    throwError(ERR.INVALID_INPUT, "Role scope is required")
  }

  return roleDefinitionQueries.many({
    where: {
      scope,
      isActive: true,
      isAssignable: true,
    },
    orderBy: [{ hierarchyRank: "desc" }, { name: "asc" }],
  })
}

export async function getDefaultRoleDefinition(scope: RoleScope) {
  if (!scope) {
    throwError(ERR.INVALID_INPUT, "Role scope is required")
  }

  const roleDefinition = await roleDefinitionQueries.findFirst({
    where: {
      scope,
      isDefault: true,
      isActive: true,
    },
  })

  if (!roleDefinition) {
    throwError(ERR.NOT_FOUND, `Default ${scope} role definition not found`)
  }

  return roleDefinition
}

export async function getWorkspaceOwnerRoleDefinition() {
  return getSystemRoleDefinition("WORKSPACE", "WORKSPACE_OWNER")
}

export async function getWorkspaceDefaultRoleDefinition() {
  return getDefaultRoleDefinition("WORKSPACE")
}

export async function getPlatformDefaultRoleDefinition() {
  return getDefaultRoleDefinition("PLATFORM")
}

export async function getPlatformAdminRoleDefinition() {
  return getSystemRoleDefinition("PLATFORM", "PLATFORM_ADMIN")
}

export function toRoleAssignmentSnapshot(roleDefinition: {
  id: string
  key: string
  systemKey?: RoleSystemKey | string | null
}): RoleAssignmentSnapshot {
  return {
    roleDefinitionId: roleDefinition.id,
    roleKey: roleDefinition.key,
    roleSystemKey: (roleDefinition.systemKey as RoleSystemKey | null) ?? null,
  }
}

export async function resolveRoleAssignment(params: {
  scope: RoleScope
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?:
    | WorkspaceRoleSystemKey
    | PlatformRoleSystemKey
    | RoleSystemKey
    | null
  fallbackToDefault?: boolean
}) {
  let roleDefinition:
    | Awaited<ReturnType<typeof getRoleDefinitionById>>
    | Awaited<ReturnType<typeof getDefaultRoleDefinition>>
    | null = null

  if (params.roleDefinitionId) {
    roleDefinition = await getRoleDefinitionById(params.roleDefinitionId)
  } else if (params.roleKey) {
    roleDefinition = await getRoleDefinitionByKey(params.scope, params.roleKey)

    if (!roleDefinition) {
      throwError(
        ERR.NOT_FOUND,
        `Role definition not found for ${params.scope}:${params.roleKey}`,
      )
    }
  } else if (params.roleSystemKey) {
    roleDefinition = await getSystemRoleDefinition(
      params.scope,
      params.roleSystemKey,
    )
  } else if (params.fallbackToDefault !== false) {
    roleDefinition = await getDefaultRoleDefinition(params.scope)
  }

  if (!roleDefinition) {
    throwError(ERR.INVALID_INPUT, "Role assignment could not be resolved")
  }

  if (roleDefinition.scope !== params.scope) {
    throwError(
      ERR.INVALID_INPUT,
      `Role ${roleDefinition.key} does not belong to ${params.scope} scope`,
    )
  }

  return toRoleAssignmentSnapshot(roleDefinition)
}

export async function createRoleDefinition(data: {
  scope: RoleScope
  key: string
  name: string
  description?: string | null
  isSystem?: boolean
  systemKey?: string | null
  hierarchyRank?: number | null
  isDefault?: boolean
  isAssignable?: boolean
  isActive?: boolean
}) {
  if (!data.scope || !data.key || !data.name) {
    throwError(ERR.INVALID_INPUT, "Role definition data is incomplete")
  }

  return roleDefinitionCrud.create({
    scope: data.scope,
    key: data.key,
    name: data.name,
    description: data.description ?? undefined,
    isSystem: data.isSystem ?? false,
    systemKey: data.systemKey ?? undefined,
    hierarchyRank: data.hierarchyRank ?? undefined,
    isDefault: data.isDefault ?? false,
    isAssignable: data.isAssignable ?? true,
    isActive: data.isActive ?? true,
  } as never)
}
