import { headers } from "next/headers"

export type ActorContextSnapshot = {
  sessionId?: string
  identityId?: string
  customerId?: string
  workspaceId?: string
  membershipId?: string
  workspaceRoleId?: string
  workspaceRoleKey?: string
  workspaceRoleSystemKey?: string
  workspaceRole?: string
  platformRole?: string
  platformRoleIds: string[]
  platformRoleKeys: string[]
  platformRoleSystemKeys: string[]
  platformRoles: string[]
  permissions: string[]
}

export async function readActorContext() {
  const hdrs = await headers()
  const rawPlatformRoleIds = hdrs.get("x-platform-role-ids")
  const rawPlatformRoleKeys = hdrs.get("x-platform-role-keys")
  const rawPlatformRoleSystemKeys = hdrs.get("x-platform-role-system-keys")
  const rawPlatformRoles = hdrs.get("x-platform-roles")
  const rawPermissions = hdrs.get("x-permissions")
  const parsedPlatformRoles = rawPlatformRoles
    ? (JSON.parse(rawPlatformRoles) as string[])
    : []
  const parsedPlatformRoleKeys = rawPlatformRoleKeys
    ? (JSON.parse(rawPlatformRoleKeys) as string[])
    : parsedPlatformRoles

  const actor: ActorContextSnapshot = {
    sessionId: hdrs.get("x-session-id") ?? undefined,
    identityId: hdrs.get("x-identity-id") ?? undefined,
    customerId: hdrs.get("x-customer-id") ?? undefined,
    workspaceId: hdrs.get("x-workspace-id") ?? undefined,
    membershipId: hdrs.get("x-membership-id") ?? undefined,
    workspaceRoleId: hdrs.get("x-workspace-role-id") ?? undefined,
    workspaceRoleKey:
      hdrs.get("x-workspace-role-key") ??
      hdrs.get("x-workspace-role") ??
      undefined,
    workspaceRoleSystemKey: hdrs.get("x-workspace-role-system-key") ?? undefined,
    workspaceRole: hdrs.get("x-workspace-role") ?? undefined,
    platformRole: hdrs.get("x-platform-role") ?? undefined,
    platformRoleIds: rawPlatformRoleIds
      ? (JSON.parse(rawPlatformRoleIds) as string[])
      : [],
    platformRoleKeys: parsedPlatformRoleKeys,
    platformRoleSystemKeys: rawPlatformRoleSystemKeys
      ? (JSON.parse(rawPlatformRoleSystemKeys) as string[])
      : [],
    platformRoles: parsedPlatformRoles,
    permissions: rawPermissions ? (JSON.parse(rawPermissions) as string[]) : [],
  }

  const rawRequestContext = hdrs.get("x-request-context")
  const requestContext = rawRequestContext
    ? (JSON.parse(rawRequestContext) as unknown)
    : null

  return { actor, requestContext }
}
