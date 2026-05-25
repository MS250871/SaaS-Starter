import { Suspense } from "react"
import { cookies } from "next/headers"

import { AdminNotificationLinkButton } from "@/components/admin/admin-notification-link-button"
import {
  AdminShell,
  type AdminAccountLink,
  type AdminNavChild,
  type AdminNavGroup,
} from "@/components/admin/admin-shell"
import { readActorContext } from "@/lib/request/read-actor-context"
import { withActionReadContext } from "@/lib/request/withActionContext"
import { buildWorkspaceAdminPath } from "@/modules/workspace/admin-routes"
import { WorkspaceNotificationMenuSlot } from "@/modules/notifications/server/workspace-notification-menu-slot"
import { buildWorkspaceSurfacePath } from "@/modules/workspace/routing"
import { getWorkspaceThemeSnapshot } from "@/modules/workspace/services/setting.services"
import { buildWorkspaceSettingsLinks } from "@/modules/workspace/settings-navigation"
import { buildWorkspaceThemeStyle } from "@/modules/workspace/theme"

function hasPermissionGroup(permissions: string[], group: string) {
  return permissions.some((permission) => permission.startsWith(`${group}.`))
}

function hasAnyPermissionGroup(permissions: string[], groups: string[]) {
  return groups.some((group) => hasPermissionGroup(permissions, group))
}

function getDisplayName(params: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  const fullName = `${params.firstName ?? ""} ${params.lastName ?? ""}`.trim()

  if (fullName) {
    return fullName
  }

  if (params.email) {
    return params.email
  }

  return "Workspace User"
}

function getInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0) {
    return "SU"
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

function buildWorkspaceNavGroups(permissions: string[], basePath: string) {
  const navGroups: AdminNavGroup[] = [
    {
      label: "Core",
      items: [
        {
          title: "Overview",
          href: basePath,
          icon: "dashboard",
          exact: true,
        },
      ],
    },
  ]

  const peopleItems = []

  if (hasAnyPermissionGroup(permissions, ["membership", "workspaceInvite"])) {
    peopleItems.push({
      title: "Team",
      href: buildWorkspaceAdminPath(basePath, "team"),
      icon: "users" as const,
    })
  }

  if (hasPermissionGroup(permissions, "customer")) {
    peopleItems.push({
      title: "Customers",
      href: buildWorkspaceAdminPath(basePath, "customers"),
      icon: "briefcase" as const,
    })
  }

  if (peopleItems.length > 0) {
    navGroups.push({
      label: "People",
      items: peopleItems,
    })
  }

  const operationsItems = []

  if (hasPermissionGroup(permissions, "media")) {
    operationsItems.push({
      title: "Media",
      href: buildWorkspaceAdminPath(basePath, "media"),
      icon: "image" as const,
    })
  }

  if (hasPermissionGroup(permissions, "supportTicket")) {
    operationsItems.push({
      title: "Support",
      href: buildWorkspaceAdminPath(basePath, "support"),
      icon: "lifebuoy" as const,
    })
  }

  if (hasPermissionGroup(permissions, "notification")) {
    operationsItems.push({
      title: "Notifications",
      href: buildWorkspaceAdminPath(basePath, "notifications"),
      icon: "bell" as const,
      hiddenInSidebar: true,
    })
  }

  if (operationsItems.length > 0) {
    navGroups.push({
      label: "Operations",
      items: operationsItems,
    })
  }

  const settingsChildren: AdminNavChild[] = buildWorkspaceSettingsLinks(
    permissions,
    basePath,
  )
  const settingsHref = buildWorkspaceAdminPath(basePath, "settings")

  if (settingsChildren.length > 0) {
    navGroups.push({
      label: "Settings",
      items: [
        {
          title: "Settings",
          href: settingsHref,
          icon: "settings",
          hiddenInSidebar: true,
          children: settingsChildren,
        },
      ],
    })
  }

  return navGroups
}

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const { actor, requestContext, session } = await readActorContext()
  const workspaceId = actor.workspaceId

  let themes: unknown = undefined
  const workspaceContext = requestContext?.workspace

  if (workspaceId) {
    const themeSnapshot = await withActionReadContext(() =>
      getWorkspaceThemeSnapshot(workspaceId),
    )
    themes = themeSnapshot?.themes
  }

  const userName = getDisplayName({
    firstName: session?.identityFirstName,
    lastName: session?.identityLastName,
    email: session?.identityEmail,
  })
  const userEmail = session?.identityEmail
  const workspaceName =
    session?.workspaceName ?? workspaceContext?.slug ?? "Workspace"
  const workspaceBasePath =
    workspaceContext?.slug
      ? buildWorkspaceSurfacePath({
          strategy: workspaceContext.strategy,
          slug: workspaceContext.slug,
          path: "/app",
        })
      : "/app"
  const notificationsHref = buildWorkspaceAdminPath(
    workspaceBasePath,
    "notifications",
  )

  const navGroups = buildWorkspaceNavGroups(actor.permissions, workspaceBasePath)
  const accountLinks: AdminAccountLink[] = []
  const topbarSettingsLinks: AdminNavChild[] = buildWorkspaceSettingsLinks(
    actor.permissions,
    workspaceBasePath,
  )

  return (
    <div
      className="workspace-surface min-h-svh"
      style={buildWorkspaceThemeStyle(themes)}
    >
      <AdminShell
        areaLabel="Workspace"
        logoHref={workspaceBasePath}
        sidebarBrand={{
          title: workspaceName,
          ariaLabel: `Go to ${workspaceName} workspace home`,
        }}
        notificationsHref={notificationsHref}
        notificationsSlot={
          workspaceId && actor.identityId ? (
            <Suspense
              fallback={
                <AdminNotificationLinkButton
                  areaLabel="Workspace"
                  href={notificationsHref}
                />
              }
            >
              <WorkspaceNotificationMenuSlot
                areaLabel="Workspace"
                href={notificationsHref}
                workspaceId={workspaceId}
                identityId={actor.identityId}
              />
            </Suspense>
          ) : undefined
        }
        breadcrumbs={[
          { label: "Workspace", href: workspaceBasePath },
          { label: workspaceName, href: workspaceBasePath },
        ]}
        navGroups={navGroups}
        user={{
          name: userName,
          email: userEmail,
          initials: getInitials(userName),
        }}
        accountLinks={accountLinks}
        topbarSettingsLinks={topbarSettingsLinks}
        defaultSidebarOpen={defaultSidebarOpen}
      >
        {children}
      </AdminShell>
    </div>
  )
}
