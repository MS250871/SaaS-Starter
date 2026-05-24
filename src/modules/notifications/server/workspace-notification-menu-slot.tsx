import { AdminNotificationMenu } from "@/components/admin/admin-notification-menu";
import { withActionReadContext } from "@/lib/request/withActionContext";

import { getWorkspaceNotificationInboxData } from "./workspace-notifications-page-data";

export async function WorkspaceNotificationMenuSlot({
  areaLabel,
  href,
  workspaceId,
  identityId,
}: {
  areaLabel: string;
  href: string;
  workspaceId: string;
  identityId: string;
}) {
  const inboxData = await withActionReadContext(() =>
    getWorkspaceNotificationInboxData({
      workspaceId,
      identityId,
      limit: 8,
    }),
  );

  return (
    <AdminNotificationMenu
      areaLabel={areaLabel}
      href={href}
      notifications={{
        unreadCount: inboxData.unreadCount,
        items: inboxData.items.map((item) => ({
          ...item,
          href: item.href ?? href,
        })),
      }}
    />
  );
}
