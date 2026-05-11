import { cookies } from "next/headers"

import { AdminShell, type AdminNavGroup } from "@/components/admin/admin-shell"
import { prisma } from "@/lib/prisma"
import { readActorContext } from "@/lib/request/read-actor-context"
import { buildWorkspaceThemeStyle } from "@/modules/workspace/theme"

function getDisplayName(params: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  const fullName = `${params.firstName ?? ""} ${params.lastName ?? ""}`.trim()

  if (fullName) {
    return fullName
  }

  return params.email ?? "Customer User"
}

function getInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0) {
    return "CU"
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const { actor } = await readActorContext()

  let themes: unknown = undefined
  const identity = actor.identityId
    ? await prisma.identity.findUnique({
        where: { id: actor.identityId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      })
    : null
  const userName = getDisplayName(identity ?? {})

  if (actor.workspaceId) {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: actor.workspaceId },
      select: { themes: true },
    })

    themes = settings?.themes
  }

  const navGroups: AdminNavGroup[] = [
    {
      label: "Customer",
      items: [
        {
          title: "Overview",
          href: "/customer",
          icon: "briefcase",
          exact: true,
        },
        {
          title: "Billing",
          href: "/customer#billing",
          icon: "billing",
        },
        {
          title: "Activity",
          href: "/customer#activity",
          icon: "dashboard",
        },
        {
          title: "Support",
          href: "/customer#support",
          icon: "lifebuoy",
        },
      ],
    },
  ]

  return (
    <div
      className="workspace-surface min-h-svh"
      style={buildWorkspaceThemeStyle(themes)}
    >
      <AdminShell
        areaLabel="Customer"
        breadcrumbs={[
          { label: "Customer", href: "/customer" },
          { label: userName },
        ]}
        navGroups={navGroups}
        user={{
          name: userName,
          email: identity?.email ?? undefined,
          initials: getInitials(userName),
        }}
        defaultSidebarOpen={defaultSidebarOpen}
      >
        {children}
      </AdminShell>
    </div>
  )
}
