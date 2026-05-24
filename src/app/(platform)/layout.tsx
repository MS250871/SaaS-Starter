import { cookies } from "next/headers"

import { AdminShell } from "@/components/admin/admin-shell"
import { readActorContext } from "@/lib/request/read-actor-context"
import {
  filterPlatformNavGroupsByPermissions,
  platformBreadcrumbOverrides,
  platformNavGroups,
} from "@/modules/platform/admin-navigation"
import { requirePlatformAccess } from '@/modules/platform/server/require-platform-admin'

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
  await requirePlatformAccess()
  const { actor, session } = await readActorContext()
  const userName = getDisplayName({
    firstName: session?.identityFirstName,
    lastName: session?.identityLastName,
    email: session?.identityEmail,
  })
  const navGroups = filterPlatformNavGroupsByPermissions(
    platformNavGroups,
    actor.permissions ?? [],
    actor.platformRoleSystemKeys ?? [],
  )

  return (
    <AdminShell
      areaLabel="Platform"
      breadcrumbs={[{ label: "Platform", href: "/platform" }]}
      breadcrumbOverrides={platformBreadcrumbOverrides}
      navGroups={navGroups}
      user={{
        name: userName,
        email: session?.identityEmail ?? undefined,
        initials: getInitials(userName),
      }}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </AdminShell>
  )
}
