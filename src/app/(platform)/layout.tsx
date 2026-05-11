import { cookies } from "next/headers"

import { AdminShell, type AdminNavGroup } from "@/components/admin/admin-shell"
import { prisma } from "@/lib/prisma"
import { readActorContext } from "@/lib/request/read-actor-context"

function getDisplayName(params: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  const fullName = `${params.firstName ?? ""} ${params.lastName ?? ""}`.trim()

  if (fullName) {
    return fullName
  }

  return params.email ?? "Platform User"
}

function getInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0) {
    return "PU"
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const { actor } = await readActorContext()
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

  const navGroups: AdminNavGroup[] = [
    {
      label: "Platform",
      items: [
        {
          title: "Overview",
          href: "/platform",
          icon: "dashboard",
          exact: true,
        },
        {
          title: "Governance",
          href: "/platform#governance",
          icon: "shield",
        },
        {
          title: "Members",
          href: "/platform#memberships",
          icon: "users",
        },
        {
          title: "Signals",
          href: "/platform#signals",
          icon: "shield",
        },
      ],
    },
  ]

  return (
    <AdminShell
      areaLabel="Platform"
      breadcrumbs={[
        { label: "Platform", href: "/platform" },
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
  )
}
