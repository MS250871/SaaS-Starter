import crypto from "crypto"
import {
  workspaceInviteCrud,
  workspaceInviteQueries,
} from "@/modules/workspace/db"
import type { Prisma } from "@/generated/prisma/client"
import {
  getRoleDefinitionById,
  getWorkspaceDefaultRoleDefinition,
  resolveRoleAssignment,
} from "@/modules/roles/role.services"
import type { WorkspaceRoleSystemKey } from "@/modules/roles/role.types"
import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

type WorkspaceInviteRoleInput = {
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: WorkspaceRoleSystemKey | null
}

export type WorkspacePendingInviteWithRole = Prisma.WorkspaceInviteGetPayload<{
  select: {
    id: true
    email: true
    roleKey: true
    roleSystemKey: true
    roleDefinition: {
      select: {
        id: true
        name: true
        hierarchyRank: true
      }
    }
    status: true
    token: true
    expiresAt: true
    createdAt: true
  }
}>

export type PlatformWorkspaceInviteAdminSnapshot = Prisma.WorkspaceInviteGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    email: true;
    roleKey: true;
    roleSystemKey: true;
    status: true;
    token: true;
    expiresAt: true;
    createdAt: true;
    invitedBy: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
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
  };
}>

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex")
}

export async function getInviteById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  const invite = await workspaceInviteQueries.findUnique({
    where: { id },
  })
  if (!invite) throwError(ERR.NOT_FOUND, "Invite not found")

  return invite
}

export async function findInviteByToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, "Token is required")

  return workspaceInviteQueries.findFirst({
    where: { token },
  })
}

export async function findPendingWorkspaceInviteByEmail(
  workspaceId: string,
  email: string,
) {
  if (!workspaceId || !email) {
    throwError(ERR.INVALID_INPUT, "workspaceId and email are required")
  }

  return workspaceInviteQueries.findFirst({
    where: {
      workspaceId,
      email: email.toLowerCase(),
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function createInvite(data: Record<string, unknown>) {
  if (!data?.workspaceId || !data?.email) {
    throwError(ERR.INVALID_INPUT, "Invalid invite data")
  }

  try {
    return await workspaceInviteCrud.create({
      ...data,
      email: String(data.email).toLowerCase(),
      token:
        typeof data.token === "string" ? data.token : generateInviteToken(),
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create invite", undefined, e)
  }
}

export async function createWorkspaceInvite(params: {
  workspaceId: string
  email: string
  invitedById?: string | null
  expiresAt?: Date | null
} & WorkspaceInviteRoleInput) {
  if (!params.workspaceId || !params.email) {
    throwError(ERR.INVALID_INPUT, "Invalid invite params")
  }

  const defaultRole =
    !params.roleDefinitionId && !params.roleKey && !params.roleSystemKey
      ? await getWorkspaceDefaultRoleDefinition()
      : null

  const role = await resolveRoleAssignment({
    scope: "WORKSPACE",
    roleDefinitionId: params.roleDefinitionId ?? defaultRole?.id,
    roleKey: params.roleKey ?? defaultRole?.key,
    roleSystemKey:
      params.roleSystemKey ??
      ((defaultRole?.systemKey as WorkspaceRoleSystemKey | null | undefined) ??
        undefined),
    fallbackToDefault: true,
  })
  const roleDefinition = await getRoleDefinitionById(role.roleDefinitionId)

  if (!roleDefinition.isAssignable) {
    throwError(
      ERR.FORBIDDEN,
      "The selected workspace role cannot be assigned through invites.",
    )
  }

  try {
    return await workspaceInviteCrud.create({
      workspaceId: params.workspaceId,
      email: params.email.toLowerCase(),
      invitedById: params.invitedById ?? undefined,
      roleDefinitionId: role.roleDefinitionId,
      roleKey: role.roleKey,
      roleSystemKey: role.roleSystemKey ?? undefined,
      token: generateInviteToken(),
      expiresAt: params.expiresAt ?? undefined,
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create workspace invite", undefined, e)
  }
}

export async function updateInvite(id: string, data: Record<string, unknown>) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await workspaceInviteCrud.update(id, data as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to update invite", undefined, e)
  }
}

export async function acceptInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await workspaceInviteCrud.update(id, {
      status: "ACCEPTED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to accept invite", undefined, e)
  }
}

export async function revokeInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await workspaceInviteCrud.update(id, {
      status: "REVOKED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to revoke invite", undefined, e)
  }
}

export async function expireInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await workspaceInviteCrud.update(id, {
      status: "EXPIRED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to expire invite", undefined, e)
  }
}

export async function deleteInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await workspaceInviteCrud.delete(id)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to delete invite", undefined, e)
  }
}

export async function listWorkspaceInvites(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId is required")
  }

  return workspaceInviteQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  })
}

export async function countPendingWorkspaceInvites(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId is required")
  }

  return workspaceInviteQueries.count({
    where: {
      workspaceId,
      status: "PENDING",
    },
  })
}

export async function listPendingWorkspaceInvitesWithRoles(
  workspaceId: string,
  limit = 20,
): Promise<WorkspacePendingInviteWithRole[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, "workspaceId is required")
  }

  const invites = await workspaceInviteQueries.many({
    where: {
      workspaceId,
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      email: true,
      roleKey: true,
      roleSystemKey: true,
      roleDefinition: {
        select: {
          id: true,
          name: true,
          hierarchyRank: true,
        },
      },
      status: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return invites as unknown as WorkspacePendingInviteWithRole[]
}

export async function listPlatformWorkspaceInviteAdminSnapshots(opts?: {
  limit?: number;
}) {
  const invites = await workspaceInviteQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 250,
    select: {
      id: true,
      workspaceId: true,
      email: true,
      roleKey: true,
      roleSystemKey: true,
      status: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
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
    },
  });

  return invites as PlatformWorkspaceInviteAdminSnapshot[];
}

export function isInviteExpired(invite: { expiresAt?: Date | null }) {
  if (!invite.expiresAt) return false
  return new Date() > invite.expiresAt
}

export async function validateInviteToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, "Token is required")

  const invite = await findInviteByToken(token)

  if (!invite) {
    throwError(ERR.NOT_FOUND, "Invalid invite token")
  }
  if (invite.status !== "PENDING") {
    throwError(ERR.INVALID_INPUT, "Invite already used or revoked")
  }
  if (isInviteExpired(invite)) {
    throwError(ERR.INVALID_INPUT, "Invite has expired")
  }

  return invite
}
