import type { ActorContext } from "./actor-context"
import {
  isPlatformAdminSystemKey,
  toPlatformRoleSystemKey,
  toWorkspaceRoleSystemKey,
  type PlatformRoleSystemKey,
} from "@/modules/roles/role.types"

type BuildActorContextParams = {
  identityId?: string
  customerId?: string
  platformRole?: string
  platformRoleKeys?: string[]
  platformRoleSystemKeys?: string[]
  workspaceId?: string
  workspaceRole?: string
  workspaceRoleKey?: string
  workspaceRoleSystemKey?: string
  membershipId?: string
  permissions?: string[]
}

export function buildActorContext(
  params: BuildActorContextParams = {},
): ActorContext {
  const platformRoleKeys = Array.from(
    new Set(
      [params.platformRole, ...(params.platformRoleKeys ?? [])].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  )

  const platformRoleSystemKeys = Array.from(
    new Set(
      [
        ...(params.platformRoleSystemKeys ?? []).map(toPlatformRoleSystemKey),
        ...platformRoleKeys.map(toPlatformRoleSystemKey),
      ].filter((value): value is PlatformRoleSystemKey => Boolean(value)),
    ),
  ) as PlatformRoleSystemKey[]

  const workspaceRoleKey = params.workspaceRoleKey ?? params.workspaceRole
  const workspaceRoleSystemKey =
    toWorkspaceRoleSystemKey(params.workspaceRoleSystemKey) ??
    toWorkspaceRoleSystemKey(workspaceRoleKey)

  const primaryPlatformRole =
    platformRoleKeys[0] ?? platformRoleSystemKeys[0] ?? undefined

  const isPlatformAdmin = platformRoleSystemKeys.some(isPlatformAdminSystemKey)

  let actorType: ActorContext["actorType"] = "system"

  if (params.identityId) actorType = "identity"
  if (params.customerId) actorType = "customer"

  return {
    actorType,
    identityId: params.identityId,
    customerId: params.customerId,
    platformRole: primaryPlatformRole,
    platformRoleKeys,
    platformRoleSystemKeys,
    isPlatformAdmin,
    workspaceId: params.workspaceId,
    workspaceRole: workspaceRoleKey,
    workspaceRoleKey,
    workspaceRoleSystemKey,
    membershipId: params.membershipId,
    permissions: params.permissions ?? [],
  }
}
