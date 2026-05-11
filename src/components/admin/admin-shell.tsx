"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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

import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { logoutAction } from "@/modules/auth/actions/logout.action"
import { markAllWorkspaceNotificationsReadAction } from "@/modules/workspace/actions/mark-all-workspace-notifications-read.action"
import { markWorkspaceNotificationReadAction } from "@/modules/workspace/actions/mark-workspace-notification-read.action"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { normalizeWorkspaceAdminPath } from "@/modules/workspace/admin-routes"

export type AdminBreadcrumb = {
  label: string
  href?: string
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
}

export type AdminNavItem = {
  title: string
  href: string
  icon: AdminIconName
  exact?: boolean
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
  navGroups: AdminNavGroup[]
  user: AdminShellUser
  accountLinks?: AdminAccountLink[]
  notificationsHref?: string
  notifications?: {
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
  logoHref?: string
  defaultSidebarOpen: boolean
  children: React.ReactNode
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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
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
        ))}
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

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Calcutta",
  }).format(new Date(value))
}

function AdminNotificationMenu({
  areaLabel,
  href,
  notifications,
}: {
  areaLabel: string
  href: string
  notifications: NonNullable<AdminShellProps["notifications"]>
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [items, setItems] = React.useState(notifications.items)
  const [unreadCount, setUnreadCount] = React.useState(notifications.unreadCount)

  React.useEffect(() => {
    setItems(notifications.items)
    setUnreadCount(notifications.unreadCount)
  }, [notifications.items, notifications.unreadCount])

  const handleMarkRead = React.useCallback((notificationId: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("notificationId", notificationId)

      const response = await markWorkspaceNotificationReadAction(formData)

      if (!response.success) {
        return
      }

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      )
      setUnreadCount((current) => Math.max(current - 1, 0))
      setOpen(false)
      router.refresh()
    })
  }, [router])

  const handleMarkAllRead = React.useCallback(() => {
    startTransition(async () => {
      const response = await markAllWorkspaceNotificationsReadAction()

      if (!response.success) {
        return
      }

      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
      setOpen(false)
      router.refresh()
    })
  }, [router])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-accent hover:bg-accent/10 hover:text-accent"
          aria-label={`Open ${areaLabel.toLowerCase()} notifications`}
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-96 rounded-2xl border-border/70 p-0"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              disabled={isPending}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            items.map((item) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-5">{item.title}</p>
                      {item.body ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.body}
                        </p>
                      ) : null}
                    </div>
                    {!item.isRead ? (
                      <Badge variant="secondary" className="shrink-0">
                        New
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      {formatNotificationDate(item.createdAt)}
                    </p>
                    {!item.isRead ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-full px-3 text-[11px]"
                        disabled={isPending}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleMarkRead(item.id)
                        }}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </>
              )

              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "block rounded-2xl border px-3 py-3 transition-colors hover:bg-muted/40",
                    item.isRead ? "border-border/60 bg-background" : "border-accent/40 bg-background"
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border px-3 py-3",
                    item.isRead ? "border-border/60 bg-background" : "border-accent/40 bg-background"
                  )}
                >
                  {content}
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-border/70 p-3">
          <Button asChild variant="outline" className="w-full rounded-xl">
            <Link
              href={href}
              onClick={() => {
                setOpen(false)
              }}
            >
              Open notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminShell({
  areaLabel,
  breadcrumbs,
  navGroups,
  user,
  accountLinks,
  notificationsHref = "/app/notifications",
  notifications,
  logoHref = "/",
  defaultSidebarOpen,
  children,
}: AdminShellProps) {
  const pathname = usePathname()
  const activeTrail = React.useMemo(
    () => findActiveTrail(pathname, navGroups),
    [navGroups, pathname]
  )
  const computedBreadcrumbs = React.useMemo(() => {
    if (activeTrail.length === 0) {
      return breadcrumbs.map((crumb, index) =>
        index === breadcrumbs.length - 1 ? { ...crumb, href: undefined } : crumb
      )
    }

    return [...breadcrumbs, ...activeTrail]
  }, [activeTrail, breadcrumbs])

  return (
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
      <SidebarInset className="overflow-hidden bg-background">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background">
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
                            <Link href={crumb.href}>{crumb.label}</Link>
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
            {notifications ? (
              <AdminNotificationMenu
                areaLabel={areaLabel}
                href={notificationsHref}
                notifications={notifications}
              />
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full text-accent hover:bg-accent/10 hover:text-accent"
              >
                <Link
                  href={notificationsHref}
                  aria-label={`Open ${areaLabel.toLowerCase()} notifications`}
                >
                  <BellIcon className="size-5" />
                </Link>
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col bg-background">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
