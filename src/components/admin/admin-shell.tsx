"use client"

import * as React from "react"
import Link from "next/link"
import { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import {
  BadgeDollarSignIcon,
  BellIcon,
  BriefcaseBusinessIcon,
  ChevronsUpDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  ImageIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  PaletteIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import { AdminContentSheetProvider } from "@/components/admin/admin-content-sheet"
import { AdminNotificationLinkButton } from "@/components/admin/admin-notification-link-button"
import {
  AdminNotificationMenu,
  type AdminNotificationSnapshot,
} from "@/components/admin/admin-notification-menu"
import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { logoutAction } from "@/modules/auth/actions/logout.action"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { SessionHeartbeat } from "@/components/auth/session-heartbeat"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { normalizeWorkspaceAdminPath } from "@/modules/workspace/admin-routes"

export type AdminBreadcrumb = {
  label: string
  href?: string
}

export type AdminBreadcrumbOverride = {
  pattern: string
  breadcrumbs: AdminBreadcrumb[]
}

export type AdminIconName =
  | "bell"
  | "billing"
  | "briefcase"
  | "dashboard"
  | "globe"
  | "image"
  | "key"
  | "lifebuoy"
  | "palette"
  | "settings"
  | "shield"
  | "users"

export type AdminNavChild = {
  title: string
  href: string
  requiredPermissions?: string[]
}

export type AdminNavItem = {
  title: string
  href: string
  icon: AdminIconName
  exact?: boolean
  hiddenInSidebar?: boolean
  requiredPermissions?: string[]
  children?: AdminNavChild[]
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

export type AdminAccountLink = {
  label: string
  href: string
  icon: AdminIconName
}

export type AdminShellUser = {
  name: string
  email?: string
  initials: string
}

type AdminShellProps = {
  areaLabel: string
  breadcrumbs: AdminBreadcrumb[]
  breadcrumbOverrides?: AdminBreadcrumbOverride[]
  navGroups: AdminNavGroup[]
  user: AdminShellUser
  accountLinks?: AdminAccountLink[]
  topbarSettingsLinks?: AdminNavChild[]
  notificationsHref?: string
  notifications?: AdminNotificationSnapshot
  notificationsSlot?: React.ReactNode
  logoHref?: string
  defaultSidebarOpen: boolean
  children: React.ReactNode
}

function doesBreadcrumbPatternMatch(pathname: string, pattern: string) {
  const normalizedPathname = normalizeWorkspaceAdminPath(pathname)
  const normalizedPattern = normalizeWorkspaceAdminPath(pattern)
  const pathnameSegments = normalizedPathname.split("/").filter(Boolean)
  const patternSegments = normalizedPattern.split("/").filter(Boolean)

  if (pathnameSegments.length !== patternSegments.length) {
    return false
  }

  return patternSegments.every((segment, index) => {
    if (/^\[[^\]]+\]$/.test(segment)) {
      return true
    }

    return segment === pathnameSegments[index]
  })
}

const navIcons = {
  bell: BellIcon,
  billing: BadgeDollarSignIcon,
  briefcase: BriefcaseBusinessIcon,
  dashboard: LayoutDashboardIcon,
  globe: GlobeIcon,
  image: ImageIcon,
  key: KeyRoundIcon,
  lifebuoy: LifeBuoyIcon,
  palette: PaletteIcon,
  settings: Settings2Icon,
  shield: ShieldCheckIcon,
  users: UsersIcon,
} satisfies Record<AdminIconName, React.ComponentType<{ className?: string }>>

function isActivePath(pathname: string, href: string, exact?: boolean) {
  const normalizedPathname = normalizeWorkspaceAdminPath(pathname)
  const normalizedHref = normalizeWorkspaceAdminPath(href)

  if (exact) {
    return normalizedPathname === normalizedHref
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  )
}

function humanizeBreadcrumbSegment(segment: string) {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return "Thread"
  }

  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function buildNestedTrail(pathname: string, item: AdminNavItem) {
  const normalizedPathname = normalizeWorkspaceAdminPath(pathname)
  const normalizedHref = normalizeWorkspaceAdminPath(item.href)
  const remainder = normalizedPathname.startsWith(`${normalizedHref}/`)
    ? normalizedPathname.slice(normalizedHref.length + 1)
    : ""

  if (!remainder) {
    return null
  }

  const childLabelByHref = new Map(
    (item.children ?? []).map((child) => [
      normalizeWorkspaceAdminPath(child.href),
      child.title,
    ])
  )

  const segments = remainder.split("/").filter(Boolean)
  const trail: AdminBreadcrumb[] =
    item.title === "Overview"
      ? []
      : [
          {
            label: item.title,
            href: item.href,
          },
        ]

  let currentHref = normalizedHref

  segments.forEach((segment, index) => {
    currentHref = `${currentHref}/${segment}`
    const knownLabel = childLabelByHref.get(currentHref)
    const isLast = index === segments.length - 1

    trail.push({
      label: knownLabel ?? humanizeBreadcrumbSegment(segment),
      href: isLast ? undefined : currentHref,
    })
  })

  return trail
}

function findActiveTrail(pathname: string, navGroups: AdminNavGroup[]) {
  for (const group of navGroups) {
    for (const item of group.items) {
      const childMatch = item.children?.find((child) =>
        isActivePath(pathname, child.href, true)
      )

      if (childMatch) {
        return [
          {
            label: item.title,
            href: item.href,
          },
          {
            label: childMatch.title,
          },
        ] satisfies AdminBreadcrumb[]
      }

      if (isActivePath(pathname, item.href, item.exact)) {
        const nestedTrail = buildNestedTrail(pathname, item)

        if (nestedTrail && nestedTrail.length > 0) {
          return nestedTrail
        }

        if (item.title === "Overview") {
          return [] satisfies AdminBreadcrumb[]
        }

        return [
          {
            label: item.title,
          },
        ] satisfies AdminBreadcrumb[]
      }
    }
  }

  return [] satisfies AdminBreadcrumb[]
}

function AdminLinkPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus()

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full bg-current opacity-0 transition-opacity duration-150 ease-out group-data-[collapsible=icon]:hidden",
        pending
          ? "visible opacity-35 motion-safe:animate-pulse"
          : "invisible",
        className
      )}
    />
  )
}

function AdminSidebar({
  navGroups,
  user,
  accountLinks = [],
  logoHref = "/",
}: {
  navGroups: AdminNavGroup[]
  user: AdminShellUser
  accountLinks?: AdminAccountLink[]
  logoHref?: string
}) {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-sidebar-border/70 bg-background shadow-none hover:shadow-none"
            >
              <Link href={logoHref} aria-label="Go to workspace home">
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <Logo />
                </div>
                <div className="hidden size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:flex">
                  <span className="text-sm font-semibold">S</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.hiddenInSidebar)

          if (visibleItems.length === 0) {
            return null
          }

          return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const ItemIcon = navIcons[item.icon]
                const itemIsActive =
                  isActivePath(pathname, item.href, item.exact) ||
                  item.children?.some((child) =>
                    isActivePath(pathname, child.href, true)
                  )

                if (!item.children?.length) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={itemIsActive}
                      >
                        <Link href={item.href}>
                          <ItemIcon />
                          <span>{item.title}</span>
                          <AdminLinkPendingHint className="ml-auto" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <Collapsible
                    key={`${item.title}-${pathname}`}
                    asChild
                    defaultOpen={itemIsActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={itemIsActive}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (state === "collapsed") {
                              setOpen(true)
                            }
                          }}
                        >
                          <ItemIcon />
                          <span>{item.title}</span>
                          <AdminLinkPendingHint className="ml-auto" />
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRightIcon />
                          <span className="sr-only">Toggle {item.title}</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActivePath(pathname, child.href, true)}
                              >
                                <Link href={child.href}>
                                  <span>{child.title}</span>
                                  <AdminLinkPendingHint className="ml-auto" />
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-primary"
                >
                  <Avatar className="rounded-xl">
                    <AvatarFallback className="rounded-xl bg-sidebar-primary/12 text-sidebar-foreground">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user.email ?? "No email available"}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-xl"
                align="end"
                side="right"
                sideOffset={8}
              >
                <DropdownMenuLabel className="px-2 py-2">
                  <div className="grid gap-1">
                    <span className="font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email ?? "No email available"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                {accountLinks.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {accountLinks.map((link) => {
                        const ItemIcon = navIcons[link.icon]

                        return (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link href={link.href}>
                              <ItemIcon />
                              <span>{link.label}</span>
                              <AdminLinkPendingHint className="ml-auto" />
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutAction} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2"
                    >
                      <LogOutIcon />
                      <span>Logout</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function AdminTopbarSettingsMenu({
  areaLabel,
  links,
}: {
  areaLabel: string
  links: AdminNavChild[]
}) {
  if (links.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="border-border/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={`Open ${areaLabel.toLowerCase()} settings`}
        >
          <Settings2Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-60 rounded-2xl border-border/70"
      >
        <DropdownMenuLabel className="px-2 py-2">
          {areaLabel} settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {links.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href}>
                <span>{link.title}</span>
                <AdminLinkPendingHint className="ml-auto" />
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminShell({
  areaLabel,
  breadcrumbs,
  breadcrumbOverrides = [],
  navGroups,
  user,
  accountLinks,
  topbarSettingsLinks = [],
  notificationsHref = "/app/notifications",
  notifications,
  notificationsSlot,
  logoHref = "/",
  defaultSidebarOpen,
  children,
}: AdminShellProps) {
  const pathname = usePathname()
  const activeTrail = React.useMemo(
    () => findActiveTrail(pathname, navGroups),
    [navGroups, pathname]
  )
  const breadcrumbOverrideTrail = React.useMemo(() => {
    const match = breadcrumbOverrides.find((override) =>
      doesBreadcrumbPatternMatch(pathname, override.pattern)
    )

    return match?.breadcrumbs ?? null
  }, [breadcrumbOverrides, pathname])
  const computedBreadcrumbs = React.useMemo(() => {
    if (breadcrumbOverrideTrail) {
      return [...breadcrumbs, ...breadcrumbOverrideTrail]
    }

    if (activeTrail.length === 0) {
      return breadcrumbs.map((crumb, index) =>
        index === breadcrumbs.length - 1 ? { ...crumb, href: undefined } : crumb
      )
    }

    return [...breadcrumbs, ...activeTrail]
  }, [activeTrail, breadcrumbOverrideTrail, breadcrumbs])

  return (
    <AdminContentSheetProvider>
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        style={
          {
            "--sidebar-width": "17.5rem",
          } as React.CSSProperties
        }
      >
        <SessionHeartbeat />
        <AdminSidebar
          navGroups={navGroups}
          user={user}
          accountLinks={accountLinks}
          logoHref={logoHref}
        />
        <SidebarInset className="overflow-hidden bg-background ring-1 ring-border/70">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="flex min-h-16 items-center gap-3 px-4 md:px-6">
              <SidebarTrigger className="-ml-1 text-accent hover:text-accent" />
              <div
                aria-hidden="true"
                className="hidden h-4 w-px self-center bg-border/70 md:block"
              />
              <div className="min-w-0 flex-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    {computedBreadcrumbs.map((crumb, index) => (
                      <React.Fragment key={`${crumb.label}-${index}`}>
                        <BreadcrumbItem
                          className={cn(
                            index < computedBreadcrumbs.length - 1 &&
                              "hidden md:inline-flex"
                          )}
                        >
                          {crumb.href ? (
                            <BreadcrumbLink asChild>
                              <Link href={crumb.href}>
                                <span>{crumb.label}</span>
                                <AdminLinkPendingHint className="ml-2" />
                              </Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {index < computedBreadcrumbs.length - 1 && (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <ThemeToggle />
              {notificationsSlot ? (
                notificationsSlot
              ) : notifications ? (
                <AdminNotificationMenu
                  areaLabel={areaLabel}
                  href={notificationsHref}
                  notifications={notifications}
                />
              ) : (
                <AdminNotificationLinkButton
                  areaLabel={areaLabel}
                  href={notificationsHref}
                />
              )}
              <AdminTopbarSettingsMenu
                areaLabel={areaLabel}
                links={topbarSettingsLinks}
              />
            </div>
          </header>

          <div className="flex flex-1 flex-col bg-background">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminContentSheetProvider>
  )
}
