import { cookies, headers } from "next/headers"

import {
  AdminShell,
  type AdminAccountLink,
  type AdminNavChild,
  type AdminNavGroup,
} from "@/components/admin/admin-shell"
import { prisma } from "@/lib/prisma"
import { readActorContext } from "@/lib/request/read-actor-context"
import { withActionTxContext } from "@/lib/request/withActionContext"
import { buildWorkspaceAdminPath } from "@/modules/workspace/admin-routes"
import { buildWorkspaceThemeStyle } from "@/modules/workspace/theme"
import { getWorkspaceNotificationInboxData } from "@/modules/notifications/server/workspace-notifications-page-data"
import {
  getRootDomainHost,
  isRootWorkspaceHost,
  normalizeHostname,
} from "@/lib/middleware/proxy-utils"

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

function resolveWorkspaceBasePath(params: {
  host?: string | null
  strategy?: string | null
  slug?: string | null
}) {
  const normalizedHost = normalizeHostname(params.host ?? "")
  const rootHost = getRootDomainHost()

  if (
    params.slug &&
    params.strategy === "free_path" &&
    isRootWorkspaceHost(normalizedHost, rootHost)
  ) {
    return `/${params.slug}/app`
  }

  return "/app"
}

function buildSettingsChildren(permissions: string[], basePath: string) {
  const children: AdminNavChild[] = []

  if (hasPermissionGroup(permissions, "workspaceDomain")) {
    children.push({
      title: "Domains",
      href: buildWorkspaceAdminPath(basePath, "domains"),
    })
  }

  if (
    hasAnyPermissionGroup(permissions, ["subscription", "payment", "invoice"])
  ) {
    children.push({
      title: "Billing",
      href: buildWorkspaceAdminPath(basePath, "billing"),
    })
  }

  if (hasPermissionGroup(permissions, "workspaceSettings")) {
    children.push({
      title: "Themes",
      href: buildWorkspaceAdminPath(basePath, "settings/theme"),
    })
  }

  if (hasAnyPermissionGroup(permissions, ["permission", "role"])) {
    children.push({
      title: "Access",
      href: buildWorkspaceAdminPath(basePath, "settings/access"),
    })
  }

  if (hasAnyPermissionGroup(permissions, ["featureOverride", "limitOverride"])) {
    children.push({
      title: "Features & Limits",
      href: buildWorkspaceAdminPath(basePath, "settings/features"),
    })
  }

  if (hasPermissionGroup(permissions, "audit")) {
    children.push({
      title: "Audit Log",
      href: buildWorkspaceAdminPath(basePath, "settings/audit"),
    })
  }

  return children
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

  if (hasPermissionGroup(permissions, "apiKey")) {
    operationsItems.push({
      title: "API Keys",
      href: buildWorkspaceAdminPath(basePath, "api-keys"),
      icon: "key" as const,
    })
  }

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
    })
  }

  if (operationsItems.length > 0) {
    navGroups.push({
      label: "Operations",
      items: operationsItems,
    })
  }

  const settingsChildren = buildSettingsChildren(permissions, basePath)
  const settingsHref = buildWorkspaceAdminPath(basePath, "settings")

  if (settingsChildren.length > 0) {
    navGroups.push({
      label: "Settings",
      items: [
        {
          title: "Settings",
          href: settingsHref,
          icon: "settings",
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
  const { actor } = await readActorContext()
  const hdrs = await headers()
  const workspaceId = actor.workspaceId

  let themes: unknown = undefined
  let userName = "Workspace User"
  let workspaceName = "Workspace"
  let workspaceSlug: string | null = null
  let workspaceStrategy: string | null = null
  let notificationMenu:
    | {
        unreadCount: number
        items: Array<{
          id: string
          title: string
          body?: string | null
          createdAt: string
          isRead: boolean
          href?: string | null
        }>
      }
    | undefined

  const [workspace, settings, identity] = await Promise.all([
    workspaceId
      ? prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            name: true,
            slug: true,
          },
        })
      : Promise.resolve(null),
    workspaceId
      ? prisma.workspaceSettings.findUnique({
          where: { workspaceId },
          select: {
            themes: true,
            settings: true,
          },
        })
      : Promise.resolve(null),
    actor.identityId
      ? prisma.identity.findUnique({
          where: { id: actor.identityId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : Promise.resolve(null),
  ])

  workspaceName = workspace?.name ?? "Workspace"
  workspaceSlug = workspace?.slug ?? null
  themes = settings?.themes
  workspaceStrategy =
    (
      settings?.settings as {
        domain?: { strategy?: string | null }
      } | null
    )?.domain?.strategy ?? null
  userName = getDisplayName(identity ?? {})
  const userEmail = identity?.email ?? undefined
  const workspaceBasePath = resolveWorkspaceBasePath({
    host: hdrs.get("host"),
    strategy: workspaceStrategy,
    slug: workspaceSlug,
  })

  const actorIdentityId = actor.identityId

  if (workspaceId && actorIdentityId) {
    const inboxData = await withActionTxContext(() =>
      getWorkspaceNotificationInboxData({
        workspaceId,
        identityId: actorIdentityId,
        limit: 8,
      }),
    )

    notificationMenu = {
      unreadCount: inboxData.unreadCount,
      items: inboxData.items.map((item: (typeof inboxData.items)[number]) => ({
        ...item,
        href: item.href ?? buildWorkspaceAdminPath(workspaceBasePath, "notifications"),
      })),
    }
  }

  const navGroups = buildWorkspaceNavGroups(actor.permissions, workspaceBasePath)
  const accountLinks: AdminAccountLink[] = hasPermissionGroup(
    actor.permissions,
    "workspaceSettings"
  )
    ? [
        {
          label: "Themes",
          href: buildWorkspaceAdminPath(workspaceBasePath, "settings/theme"),
          icon: "palette",
        },
      ]
    : []

  return (
    <div
      className="workspace-surface min-h-svh"
      style={buildWorkspaceThemeStyle(themes)}
    >
      <AdminShell
        areaLabel="Workspace"
        logoHref={workspaceBasePath}
        notificationsHref={buildWorkspaceAdminPath(
          workspaceBasePath,
          "notifications"
        )}
        notifications={notificationMenu}
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
        defaultSidebarOpen={defaultSidebarOpen}
      >
        {children}
      </AdminShell>
    </div>
  )
}
