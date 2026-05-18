import crypto from "crypto"
import {
  platformInviteCrud,
  platformInviteQueries,
} from "@/modules/platform/db"
import {
  getPlatformDefaultRoleDefinition,
  resolveRoleAssignment,
} from "@/modules/roles/role.services"
import type { PlatformRoleSystemKey } from "@/modules/roles/role.types"
import { throwError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"

type PlatformInviteRoleInput = {
  roleDefinitionId?: string | null
  roleKey?: string | null
  roleSystemKey?: PlatformRoleSystemKey | null
}

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex")
}

export async function getPlatformInviteById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  const invite = await platformInviteQueries.byId(id)
  if (!invite) throwError(ERR.NOT_FOUND, "Invite not found")

  return invite
}

export async function findPlatformInviteByToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, "Token is required")

  return platformInviteQueries.findFirst({
    where: { token },
  })
}

export async function createPlatformInvite(data: Record<string, unknown>) {
  if (!data?.email) {
    throwError(ERR.INVALID_INPUT, "Invalid invite data")
  }

  try {
    return await platformInviteCrud.create({
      ...data,
      email: String(data.email).toLowerCase(),
      token:
        typeof data.token === "string" ? data.token : generateInviteToken(),
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create platform invite", undefined, e)
  }
}

export async function createPlatformInviteEntry(params: {
  email: string
  invitedById?: string | null
  expiresAt?: Date | null
} & PlatformInviteRoleInput) {
  if (!params.email) {
    throwError(ERR.INVALID_INPUT, "Invalid invite params")
  }

  const defaultRole =
    !params.roleDefinitionId && !params.roleKey && !params.roleSystemKey
      ? await getPlatformDefaultRoleDefinition()
      : null

  const role = await resolveRoleAssignment({
    scope: "PLATFORM",
    roleDefinitionId: params.roleDefinitionId ?? defaultRole?.id,
    roleKey: params.roleKey ?? defaultRole?.key,
    roleSystemKey:
      params.roleSystemKey ??
      ((defaultRole?.systemKey as PlatformRoleSystemKey | null | undefined) ??
        undefined),
    fallbackToDefault: true,
  })

  try {
    return await platformInviteCrud.create({
      email: params.email.toLowerCase(),
      invitedById: params.invitedById ?? undefined,
      roleDefinitionId: role.roleDefinitionId,
      roleKey: role.roleKey,
      roleSystemKey: role.roleSystemKey ?? undefined,
      token: generateInviteToken(),
      expiresAt: params.expiresAt ?? undefined,
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to create platform invite", undefined, e)
  }
}

export async function updatePlatformInvite(
  id: string,
  data: Record<string, unknown>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await platformInviteCrud.update(id, data as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to update invite", undefined, e)
  }
}

export async function acceptPlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await platformInviteCrud.update(id, {
      status: "ACCEPTED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to accept invite", undefined, e)
  }
}

export async function revokePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await platformInviteCrud.update(id, {
      status: "REVOKED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to revoke invite", undefined, e)
  }
}

export async function expirePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await platformInviteCrud.update(id, {
      status: "EXPIRED",
    } as never)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to expire invite", undefined, e)
  }
}

export async function deletePlatformInvite(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, "Invite ID is required")

  try {
    return await platformInviteCrud.delete(id)
  } catch (e) {
    throwError(ERR.DB_ERROR, "Failed to delete invite", undefined, e)
  }
}

export async function listPlatformInvites() {
  return platformInviteQueries.many({
    orderBy: { createdAt: "desc" },
  })
}

export function isPlatformInviteExpired(invite: { expiresAt?: Date | null }) {
  if (!invite.expiresAt) return false
  return new Date() > invite.expiresAt
}

export async function validatePlatformInviteToken(token: string) {
  if (!token) throwError(ERR.INVALID_INPUT, "Token is required")

  const invite = await findPlatformInviteByToken(token)

  if (!invite) {
    throwError(ERR.NOT_FOUND, "Invalid invite token")
  }
  if (invite.status !== "PENDING") {
    throwError(ERR.INVALID_INPUT, "Invite already used or revoked")
  }
  if (isPlatformInviteExpired(invite)) {
    throwError(ERR.INVALID_INPUT, "Invite has expired")
  }

  return invite
}
