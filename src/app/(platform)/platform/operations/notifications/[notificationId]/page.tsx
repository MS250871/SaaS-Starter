import { PlatformNotificationDetailView } from '@/modules/platform/components/operations/platform-notification-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformNotificationDetailPageData } from '@/modules/notifications/server/platform-notifications-admin-page-data';

export default async function PlatformOperationsNotificationPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  await requirePlatformPermission('notification.read');
  const { notificationId } = await params;
  const data = await getPlatformNotificationDetailPageData(notificationId);

  return <PlatformNotificationDetailView data={data} />;
}
