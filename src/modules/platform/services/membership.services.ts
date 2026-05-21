import {
  platformMembershipCrud,
  platformMembershipQueries,
} from "@/modules/platform/db"
import type { Prisma } from "@/generated/prisma/client"
import {
  getPlatformDefaultRoleDefinition,
  resolveRoleAssignment,
  type RoleAssignmentSnapshot,
} from "@/modules/roles/role.services"
import {
  isPlatformRoleSystemKey,
  type PlatformRoleSystemKey,
} from "@/modules/roles/role.types"
import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

type PlatformMembershipRoleInput = {
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: PlatformRoleSystemKey | null
}

type CreatePlatformMembershipParams = {
  identityId: string
  isActive?: boolean
} & PlatformMembershipRoleInput

function applyRoleSnapshot(
  data: Omit<CreatePlatformMembershipParams, "roleDefinitionId" | "roleKey" | "roleSystemKey">,
  role: RoleAssignmentSnapshot,
) {
  return {
    ...data,
    roleDefinitionId: role.roleDefinitionId,
    roleKey: role.roleKey,
    roleSystemKey: role.roleSystemKey ?? undefined,
  }
}

export async function getPlatformMembershipById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID is required")

  const membership = await platformMembershipQueries.findUnique({
    where: { id },
  })
  if (!membership) throwError(ERR.NOT_FOUND, "Membership not found")

  return membership
}

export async function findPlatformMembership(
  identityId: string,
  roleDefinitionId: string,
) {
  if (!identityId || !roleDefinitionId) {
    throwError(ERR.INVALID_INPUT, "identityId and roleDefinitionId required")
  }

  return platformMembershipQueries.findFirst({
    where: { identityId, roleDefinitionId },
  })
}

export async function findPlatformMembershipBySystemKey(
  identityId: string,
  roleSystemKey: PlatformRoleSystemKey,
) {
  if (!identityId || !roleSystemKey) {
    throwError(ERR.INVALID_INPUT, "identityId and roleSystemKey required")
  }

  return platformMembershipQueries.findFirst({
    where: { identityId, roleSystemKey },
  })
}

export async function listIdentityPlatformMemberships(identityId: string) {
  if (!identityId) throwError(ERR.INVALID_INPUT, "identityId required")

  return platformMembershipQueries.many({
    where: { identityId },
    orderBy: { createdAt: "desc" },
  })
}

export async function listActivePlatformMembershipsByIdentityIds(
  identityIds: string[],
) {
  const uniqueIds = Array.from(new Set(identityIds.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return []
  }

  return platformMembershipQueries.many({
    where: {
      identityId: {
        in: uniqueIds,
      },
      isActive: true,
    },
    select: {
      identityId: true,
    },
  })
}

export async function getPlatformRoles(identityId: string) {
  const memberships = await listIdentityPlatformMemberships(identityId)

  const roles = memberships
    .filter((membership: (typeof memberships)[number]) => membership.isActive)
    .map((membership: (typeof memberships)[number]) => membership.roleKey)

  return Array.from(new Set(roles))
}

export async function createPlatformMembership(
  data: CreatePlatformMembershipParams,
) {
  if (!data?.identityId) {
    throwError(ERR.INVALID_INPUT, "Invalid membership data")
  }

  const role = await resolveRoleAssignment({
    scope: "PLATFORM",
    roleDefinitionId: data.roleDefinitionId,
    roleKey: data.roleKey,
    roleSystemKey: data.roleSystemKey ?? undefined,
    fallbackToDefault: true,
  })

  const existing = await findPlatformMembership(data.identityId, role.roleDefinitionId)

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, "Platform membership already exists")
  }

  try {
    return await platformMembershipCrud.create(
      applyRoleSnapshot(
        {
          identityId: data.identityId,
          isActive: data.isActive ?? true,
        },
        role,
      ) as never,
    )
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to create platform membership",
      undefined,
      e,
    )
  }
}

export async function createPlatformMembershipEntry(params: {
  identityId: string
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: PlatformRoleSystemKey | null
}) {
  const defaultRole =
    !params.roleDefinitionId && !params.roleKey && !params.roleSystemKey
      ? await getPlatformDefaultRoleDefinition()
      : null

  return createPlatformMembership({
    identityId: params.identityId,
    roleDefinitionId: params.roleDefinitionId ?? defaultRole?.id,
    roleKey: params.roleKey ?? defaultRole?.key,
    roleSystemKey:
      params.roleSystemKey ??
      ((defaultRole?.systemKey as PlatformRoleSystemKey | null | undefined) ??
        undefined),
  })
}

export async function updatePlatformMembership(
  id: string,
  data: Record<string, unknown>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID is required")

  try {
    return await platformMembershipCrud.update(id, data as never)
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to update platform membership",
      undefined,
      e,
    )
  }
}

export async function updatePlatformMembershipRole(
  id: string,
  roleInput: PlatformMembershipRoleInput,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, "id is required")
  }

  const role = await resolveRoleAssignment({
    scope: "PLATFORM",
    roleDefinitionId: roleInput.roleDefinitionId,
    roleKey: roleInput.roleKey,
    roleSystemKey: roleInput.roleSystemKey ?? undefined,
    fallbackToDefault: false,
  })

  return updatePlatformMembership(id, {
    roleDefinitionId: role.roleDefinitionId,
    roleKey: role.roleKey,
    roleSystemKey: role.roleSystemKey ?? undefined,
  })
}

export async function activatePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  return updatePlatformMembership(id, { isActive: true })
}

export async function deactivatePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  return updatePlatformMembership(id, { isActive: false })
}

export async function deletePlatformMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  try {
    return await platformMembershipCrud.delete(id)
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      "Failed to delete platform membership",
      undefined,
      e,
    )
  }
}

export async function listPlatformMemberships() {
  return platformMembershipQueries.many({
    orderBy: { createdAt: "desc" },
  })
}

export async function hasPlatformRole(
  identityId: string,
  roleSystemKey: PlatformRoleSystemKey,
) {
  if (!identityId || !roleSystemKey) {
    throwError(ERR.INVALID_INPUT, "identityId and roleSystemKey required")
  }

  return (
    (await platformMembershipQueries.count({
      where: {
        identityId,
        roleSystemKey,
        isActive: true,
      },
    })) > 0
  )
}

export async function isPlatformUser(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, "identityId required")
  }

  return (
    (await platformMembershipQueries.count({
      where: {
        identityId,
        isActive: true,
      },
    })) > 0
  )
}

export async function getPlatformAccessContext(identityId: string): Promise<{
  roleIds: string[]
  roleKeys: string[]
  roleSystemKeys: PlatformRoleSystemKey[]
  memberships: Awaited<ReturnType<typeof listIdentityPlatformMemberships>>
  hasAccess: boolean
}> {
  const memberships = await listIdentityPlatformMemberships(identityId)

  const active = memberships.filter(
    (membership: (typeof memberships)[number]) => membership.isActive,
  )

  return {
    roleIds: Array.from(
      new Set(active.map((membership: (typeof active)[number]) => membership.roleDefinitionId)),
    ),
    roleKeys: Array.from(
      new Set(active.map((membership: (typeof active)[number]) => membership.roleKey)),
    ),
    roleSystemKeys: Array.from(
      new Set(
        active
          .map((membership: (typeof active)[number]) => membership.roleSystemKey)
          .filter(isPlatformRoleSystemKey),
      ),
    ),
    memberships: active,
    hasAccess: active.length > 0,
  }
}

export type PlatformMembershipAdminSnapshot = Prisma.PlatformMembershipGetPayload<{
  select: {
    id: true
    identityId: true
    roleDefinitionId: true
    roleKey: true
    roleSystemKey: true
    isActive: true
    createdAt: true
    identity: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
        phone: true
        isActive: true
      }
    }
    roleDefinition: {
      select: {
        id: true
        scope: true
        key: true
        name: true
        systemKey: true
        isSystem: true
        isDefault: true
        isAssignable: true
        isActive: true
      }
    }
  }
}>

export async function listPlatformMembershipAdminSnapshots(opts?: {
  limit?: number
  identityId?: string | null
}) {
  const memberships = await platformMembershipQueries.delegate.findMany({
    where: opts?.identityId
      ? {
          identityId: opts.identityId,
        }
      : undefined,
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 500,
    select: {
      id: true,
      identityId: true,
      roleDefinitionId: true,
      roleKey: true,
      roleSystemKey: true,
      isActive: true,
      createdAt: true,
      identity: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
      roleDefinition: {
        select: {
          id: true,
          scope: true,
          key: true,
          name: true,
          systemKey: true,
          isSystem: true,
          isDefault: true,
          isAssignable: true,
          isActive: true,
        },
      },
    },
  })

  return memberships as PlatformMembershipAdminSnapshot[]
}
