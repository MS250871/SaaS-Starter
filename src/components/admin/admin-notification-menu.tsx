"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";

import { LinkPendingHint } from "@/components/layout/link-pending-hint";
import { markAllWorkspaceNotificationsReadAction } from "@/modules/notifications/actions/mark-all-workspace-notifications-read.action";
import { markWorkspaceNotificationReadAction } from "@/modules/notifications/actions/mark-workspace-notification-read.action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AdminNotificationSnapshot = {
  unreadCount: number;
  items: Array<{
    id: string;
    title: string;
    body?: string | null;
    createdAt: string;
    isRead: boolean;
    href?: string | null;
  }>;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Calcutta",
  }).format(new Date(value));
}

export function AdminNotificationMenu({
  areaLabel,
  href,
  notifications,
}: {
  areaLabel: string;
  href: string;
  notifications: AdminNotificationSnapshot;
}) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [items, setItems] = React.useState(notifications.items);
  const [unreadCount, setUnreadCount] = React.useState(notifications.unreadCount);

  React.useEffect(() => {
    setItems(notifications.items);
    setUnreadCount(notifications.unreadCount);
  }, [notifications.items, notifications.unreadCount]);

  const handleMarkRead = React.useCallback(
    (notificationId: string) => {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("notificationId", notificationId);

        const response = await markWorkspaceNotificationReadAction(formData);

        if (!response.success) {
          return;
        }

        setItems((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, isRead: true } : item,
          ),
        );
        setUnreadCount((current) => Math.max(current - 1, 0));
        setOpen(false);
      });
    },
    [],
  );

  const handleMarkAllRead = React.useCallback(() => {
    startTransition(async () => {
      const response = await markAllWorkspaceNotificationsReadAction();

      if (!response.success) {
        return;
      }

      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      setOpen(false);
    });
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative border-border/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={`Open ${areaLabel.toLowerCase()} notifications`}
        >
          <BellIcon className="size-4" />
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
                          event.preventDefault();
                          event.stopPropagation();
                          handleMarkRead(item.id);
                        }}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </>
              );

              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "block rounded-2xl border px-3 py-3 transition-colors hover:bg-muted/40",
                    item.isRead
                      ? "border-border/60 bg-background"
                      : "border-accent/40 bg-background",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border px-3 py-3",
                    item.isRead
                      ? "border-border/60 bg-background"
                      : "border-accent/40 bg-background",
                  )}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/70 p-3">
          <Button asChild variant="outline" className="w-full rounded-xl">
            <Link
              href={href}
              onClick={() => {
                setOpen(false);
              }}
            >
              Open notifications
              <LinkPendingHint className="ml-2" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
