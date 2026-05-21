import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformNotificationSendPanel } from '@/modules/platform/components/operations/platform-notification-send-panel';
import { PlatformOperationsNotificationsTable } from '@/modules/platform/components/operations/platform-operations-notifications-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformNotificationsPageData } from '@/modules/notifications/server/platform-notifications-admin-page-data';

export default async function PlatformOperationsNotificationsPage() {
  await requirePlatformPermission('notification.read');

  const data = await getPlatformNotificationsPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total notifications</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Unread</CardDescription>
            <CardTitle className="text-3xl">{data.summary.unread}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Failed deliveries</CardDescription>
            <CardTitle className="text-3xl">{data.summary.failedDeliveries}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Pending deliveries</CardDescription>
            <CardTitle className="text-3xl">{data.summary.pendingDeliveries}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformNotificationSendPanel
        workspaceOptions={data.workspaceOptions}
        workspaceRecipients={data.workspaceRecipients}
        customerRecipients={data.customerRecipients}
      />

      <PlatformOperationsNotificationsTable rows={data.rows} />
    </div>
  );
}
