import { buildWorkspaceAdminPath } from "@/modules/workspace/admin-routes"

export type WorkspaceSettingsLink = {
  title: string
  href: string
}

function hasPermissionGroup(permissions: string[], group: string) {
  return permissions.some((permission) => permission.startsWith(`${group}.`))
}

function hasAnyPermissionGroup(permissions: string[], groups: string[]) {
  return groups.some((group) => hasPermissionGroup(permissions, group))
}

export function buildWorkspaceSettingsLinks(
  permissions: string[],
  basePath: string,
): WorkspaceSettingsLink[] {
  const links: WorkspaceSettingsLink[] = []

  if (hasPermissionGroup(permissions, "workspaceDomain")) {
    links.push({
      title: "Domains",
      href: buildWorkspaceAdminPath(basePath, "domains"),
    })
  }

  if (
    hasAnyPermissionGroup(permissions, ["subscription", "payment", "invoice"])
  ) {
    links.push({
      title: "Billing",
      href: buildWorkspaceAdminPath(basePath, "billing"),
    })
  }

  if (hasPermissionGroup(permissions, "workspaceSettings")) {
    links.push({
      title: "Themes",
      href: buildWorkspaceAdminPath(basePath, "settings/theme"),
    })
  }

  if (hasAnyPermissionGroup(permissions, ["permission", "role"])) {
    links.push({
      title: "Access",
      href: buildWorkspaceAdminPath(basePath, "settings/access"),
    })
  }

  if (hasAnyPermissionGroup(permissions, ["featureOverride", "limitOverride"])) {
    links.push({
      title: "Features & Limits",
      href: buildWorkspaceAdminPath(basePath, "settings/features"),
    })
  }

  if (hasPermissionGroup(permissions, "apiKey")) {
    links.push({
      title: "API Keys",
      href: buildWorkspaceAdminPath(basePath, "api-keys"),
    })
  }

  if (hasPermissionGroup(permissions, "audit")) {
    links.push({
      title: "Audit Log",
      href: buildWorkspaceAdminPath(basePath, "settings/audit"),
    })
  }

  return links
}
