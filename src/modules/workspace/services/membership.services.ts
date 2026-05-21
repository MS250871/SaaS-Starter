import { membershipCrud, membershipQueries } from "@/modules/workspace/db"
import type { Prisma } from "@/generated/prisma/client"
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

export type WorkspaceMemberWithRole = Prisma.MembershipGetPayload<{
  select: {
    id: true
    identityId: true
    roleKey: true
    roleSystemKey: true
    createdAt: true
    roleDefinition: {
      select: {
        id: true
        name: true
        key: true
        hierarchyRank: true
      }
    }
    identity: {
      select: {
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

export type PlatformWorkspaceMembershipAdminSnapshot = Prisma.MembershipGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    identityId: true;
    roleKey: true;
    roleSystemKey: true;
    isActive: true;
    expiresAt: true;
    createdAt: true;
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        isActive: true;
      };
    };
    roleDefinition: {
      select: {
        id: true;
        name: true;
        key: true;
        hierarchyRank: true;
      };
    };
    identity: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>

export type WorkspaceNotificationRecipientMember = Prisma.MembershipGetPayload<{
  select: {
    identityId: true
    identity: {
      select: {
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

export type MembershipWorkspaceSnapshot = Prisma.MembershipGetPayload<{
  select: {
    id: true
    workspaceId: true
    identityId: true
    isActive: true
    roleKey: true
    roleSystemKey: true
    roleDefinition: {
      select: {
        id: true
        name: true
        hierarchyRank: true
      }
    }
  }
}>

export type ActiveWorkspaceMembershipIdentitySnapshot = Prisma.MembershipGetPayload<{
  select: {
    id: true
    identityId: true
    identity: {
      select: {
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

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

  const membership = await membershipQueries.findUnique({
    where: { id },
  })
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
    roleSystemKey:
      params.roleSystemKey ??
      ((defaultRole?.systemKey as WorkspaceRoleSystemKey | null | undefined) ??
        undefined),
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

  return (
    (await membershipQueries.count({
      where: {
        workspaceId,
        identityId,
        isActive: true,
      },
    })) > 0
  )
}

export async function getMembershipWorkspaceSnapshot(
  id: string,
): Promise<MembershipWorkspaceSnapshot> {
  if (!id) throwError(ERR.INVALID_INPUT, "Membership ID is required")

  const membership = await membershipQueries.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      isActive: true,
      roleKey: true,
      roleSystemKey: true,
      roleDefinition: {
        select: {
          id: true,
          name: true,
          hierarchyRank: true,
        },
      },
    },
  })

  if (!membership) {
    throwError(ERR.NOT_FOUND, "Membership not found")
  }

  return membership as unknown as MembershipWorkspaceSnapshot
}

export async function findActiveWorkspaceMembershipByIdentity(
  workspaceId: string,
  identityId: string,
): Promise<ActiveWorkspaceMembershipIdentitySnapshot | null> {
  if (!workspaceId || !identityId) {
    throwError(ERR.INVALID_INPUT, "workspaceId and identityId required")
  }

  const membership = await membershipQueries.findFirst({
    where: {
      workspaceId,
      identityId,
      isActive: true,
    },
    select: {
      id: true,
      identityId: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  return membership as unknown as ActiveWorkspaceMembershipIdentitySnapshot | null
}

export async function countActiveWorkspaceOwners(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId required")
  }

  return membershipQueries.count({
    where: {
      workspaceId,
      roleSystemKey: "WORKSPACE_OWNER",
      isActive: true,
    },
  })
}

export async function countActiveWorkspaceMemberships(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId required")
  }

  return membershipQueries.count({
    where: {
      workspaceId,
      isActive: true,
    },
  })
}

export async function listWorkspaceNotificationRecipientMembers(params: {
  workspaceId: string
  recipientMode: "all" | "single"
  recipientId?: string | null
  requireEmail?: boolean
  excludeIdentityId?: string | null
}): Promise<WorkspaceNotificationRecipientMember[]> {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId required")
  }

  const members = await membershipQueries.many({
    where: {
      workspaceId: params.workspaceId,
      isActive: true,
      identityId: params.recipientMode === "single" ? params.recipientId ?? undefined : undefined,
      ...(params.requireEmail
        ? {
            identity: {
              is: {
                email: {
                  not: null,
                },
              },
            },
          }
        : {}),
      ...(params.excludeIdentityId
        ? {
            NOT: {
              identityId: params.excludeIdentityId,
            },
          }
        : {}),
    },
    select: {
      identityId: true,
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  })

  return members as unknown as WorkspaceNotificationRecipientMember[]
}

export async function listActiveWorkspaceMembersWithRoles(
  workspaceId: string,
): Promise<WorkspaceMemberWithRole[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId required")
  }

  const memberships = await membershipQueries.many({
    where: {
      workspaceId,
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      identityId: true,
      roleKey: true,
      roleSystemKey: true,
      createdAt: true,
      roleDefinition: {
        select: {
          id: true,
          name: true,
          key: true,
          hierarchyRank: true,
        },
      },
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  return memberships as unknown as WorkspaceMemberWithRole[]
}

export async function listPlatformWorkspaceMembershipAdminSnapshots(opts?: {
  limit?: number;
}) {
  const memberships = await membershipQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 250,
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      roleKey: true,
      roleSystemKey: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      roleDefinition: {
        select: {
          id: true,
          name: true,
          key: true,
          hierarchyRank: true,
        },
      },
      identity: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return memberships as PlatformWorkspaceMembershipAdminSnapshot[];
}
