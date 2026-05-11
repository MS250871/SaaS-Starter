import { membershipCrud, membershipQueries } from "@/modules/workspace/db"
import {
  getWorkspaceDefaultRoleDefinition,
  resolveRoleAssignment,
  type RoleAssignmentSnapshot,
} from "@/modules/roles/role.services"
import type { WorkspaceRoleSystemKey } from "@/modules/roles/role.types"
import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

type MembershipRoleInput = {
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: WorkspaceRoleSystemKey | null
}

type CreateMembershipParams = {
  workspaceId: string
  identityId: string
  isActive?: boolean
  expiresAt?: Date | null
  version?: number
} & MembershipRoleInput

function applyRoleSnapshot(
  data: Omit<CreateMembershipParams, "roleDefinitionId" | "roleKey" | "roleSystemKey">,
  role: RoleAssignmentSnapshot,
) {
  return {
    ...data,
    roleDefinitionId: role.roleDefinitionId,
    roleKey: role.roleKey,
    roleSystemKey: role.roleSystemKey ?? undefined,
  }
}

export async function getMembershipById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID is required")

  const membership = await membershipQueries.byId(id)
  if (!membership) throwError(ERR.NOT_FOUND, "Membership not found")

  return membership
}

export async function findMembership(workspaceId: string, identityId: string) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, "workspaceId and identityId required")
  }

  return membershipQueries.findFirst({
    where: { workspaceId, identityId },
  })
}

export async function createMembership(data: CreateMembershipParams) {
  if (!data?.workspaceId || !data?.identityId) {
    throwError(ERR.INVALID_INPUT, "Invalid membership data")
  }

  const existing = await findMembership(data.workspaceId, data.identityId)

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, "Membership already exists")
  }

  const role = await resolveRoleAssignment({
    scope: "WORKSPACE",
    roleDefinitionId: data.roleDefinitionId,
    roleKey: data.roleKey,
    roleSystemKey: data.roleSystemKey ?? undefined,
    fallbackToDefault: true,
  })

  try {
    return await membershipCrud.create(
      applyRoleSnapshot(
        {
          workspaceId: data.workspaceId,
          identityId: data.identityId,
          isActive: data.isActive ?? true,
          expiresAt: data.expiresAt ?? undefined,
          version: data.version ?? 1,
        },
        role,
      ) as never,
    )
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create membership", undefined, e)
  }
}

export async function createWorkspaceMembership(params: {
  workspaceId: string
  identityId: string
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: WorkspaceRoleSystemKey | null
}) {
  const defaultRole =
    !params.roleDefinitionId && !params.roleKey && !params.roleSystemKey
      ? await getWorkspaceDefaultRoleDefinition()
      : null

  return createMembership({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    roleDefinitionId: params.roleDefinitionId ?? defaultRole?.id,
    roleKey: params.roleKey ?? defaultRole?.key,
    roleSystemKey: params.roleSystemKey ?? defaultRole?.systemKey ?? undefined,
  })
}

export async function updateMembership(id: string, data: Record<string, unknown>) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID is required")

  try {
    return await membershipCrud.update(id, data as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to update membership", undefined, e)
  }
}

export async function updateMembershipRole(
  id: string,
  roleInput: MembershipRoleInput,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, "id is required")
  }

  const role = await resolveRoleAssignment({
    scope: "WORKSPACE",
    roleDefinitionId: roleInput.roleDefinitionId,
    roleKey: roleInput.roleKey,
    roleSystemKey: roleInput.roleSystemKey ?? undefined,
    fallbackToDefault: false,
  })

  return updateMembership(id, {
    roleDefinitionId: role.roleDefinitionId,
    roleKey: role.roleKey,
    roleSystemKey: role.roleSystemKey ?? undefined,
  })
}

export async function activateMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  return updateMembership(id, { isActive: true })
}

export async function deactivateMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  return updateMembership(id, { isActive: false })
}

export async function deleteMembership(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID required")

  try {
    return await membershipCrud.delete(id)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to delete membership", undefined, e)
  }
}

export async function listWorkspaceMemberships(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, "workspaceId required")

  return membershipQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  })
}

export async function listIdentityMemberships(identityId: string) {
  if (!identityId) throwError(ERR.INVALID_INPUT, "identityId required")

  return membershipQueries.many({
    where: { identityId },
    orderBy: { createdAt: "desc" },
  })
}

export async function isIdentityMemberOfWorkspace(
  workspaceId: string,
  identityId: string,
) {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, "workspaceId and identityId required")
  }

  return membershipQueries.exists({
    workspaceId,
    identityId,
    isActive: true,
  })
}
