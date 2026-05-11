import { z } from "zod"

export const roleScopeSchema = z.enum(["WORKSPACE", "PLATFORM"])

export const workspaceRoleSystemKeySchema = z.enum([
  "WORKSPACE_OWNER",
  "WORKSPACE_ADMIN",
  "WORKSPACE_STAFF",
  "WORKSPACE_VIEWER",
])

export const platformRoleSystemKeySchema = z.enum([
  "PLATFORM_ADMIN",
  "PLATFORM_STAFF",
  "PLATFORM_BILLING_AGENT",
  "PLATFORM_SUPPORT_AGENT",
])

export const roleSystemKeySchema = z.union([
  workspaceRoleSystemKeySchema,
  platformRoleSystemKeySchema,
])

export const roleReferenceSchema = z.object({
  roleId: z.string().optional(),
  roleKey: z.string().optional(),
  roleSystemKey: roleSystemKeySchema.optional(),
})

export type RoleScope = z.infer<typeof roleScopeSchema>
export type WorkspaceRoleSystemKey = z.infer<typeof workspaceRoleSystemKeySchema>
export type PlatformRoleSystemKey = z.infer<typeof platformRoleSystemKeySchema>
export type RoleSystemKey = z.infer<typeof roleSystemKeySchema>
export type RoleReference = z.infer<typeof roleReferenceSchema>

export const workspaceRoleSystemKeys = workspaceRoleSystemKeySchema.options
export const platformRoleSystemKeys = platformRoleSystemKeySchema.options

export function isPlatformAdminSystemKey(
  systemKey?: string | null,
): systemKey is PlatformRoleSystemKey {
  return systemKey === "PLATFORM_ADMIN"
}

export function isWorkspaceRoleSystemKey(
  value?: string | null,
): value is WorkspaceRoleSystemKey {
  return !!value && workspaceRoleSystemKeys.includes(value as WorkspaceRoleSystemKey)
}

export function isPlatformRoleSystemKey(
  value?: string | null,
): value is PlatformRoleSystemKey {
  return !!value && platformRoleSystemKeys.includes(value as PlatformRoleSystemKey)
}

export function toWorkspaceRoleSystemKey(
  value?: string | null,
): WorkspaceRoleSystemKey | undefined {
  switch (value) {
    case "WORKSPACE_OWNER":
    case "OWNER":
    case "owner":
      return "WORKSPACE_OWNER"
    case "WORKSPACE_ADMIN":
    case "ADMIN":
    case "admin":
      return "WORKSPACE_ADMIN"
    case "WORKSPACE_STAFF":
    case "STAFF":
    case "staff":
      return "WORKSPACE_STAFF"
    case "WORKSPACE_VIEWER":
    case "VIEWER":
    case "viewer":
      return "WORKSPACE_VIEWER"
    default:
      return undefined
  }
}

export function toPlatformRoleSystemKey(
  value?: string | null,
): PlatformRoleSystemKey | undefined {
  switch (value) {
    case "PLATFORM_ADMIN":
    case "platform-admin":
      return "PLATFORM_ADMIN"
    case "PLATFORM_STAFF":
    case "platform-staff":
      return "PLATFORM_STAFF"
    case "PLATFORM_BILLING_AGENT":
    case "BILLING_AGENT":
    case "billing-agent":
      return "PLATFORM_BILLING_AGENT"
    case "PLATFORM_SUPPORT_AGENT":
    case "SUPPORT_AGENT":
    case "support-agent":
      return "PLATFORM_SUPPORT_AGENT"
    default:
      return undefined
  }
}
