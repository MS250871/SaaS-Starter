import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformWebhookEventAdminSnapshots } from '@/modules/integration/services/webhook-event.services';
import { listPlatformOutboxEventAdminSnapshots } from '@/modules/jobs/services/outbox-events.services';
import { listPlatformMediaAdminSnapshots } from '@/modules/media/services/media.services';
import { listPlatformNotificationAdminSnapshots } from '@/modules/notifications/services/notification.services';
import { listPlatformSupportTicketAdminSnapshots } from '@/modules/support/services/support.services';

export async function getPlatformOperationsOverviewData() {
  return withActionTxContext(async () => {
    const [supportTickets, notifications, webhookEvents, outboxEvents, media] =
      await Promise.all([
        listPlatformSupportTicketAdminSnapshots(),
        listPlatformNotificationAdminSnapshots(),
        listPlatformWebhookEventAdminSnapshots(),
        listPlatformOutboxEventAdminSnapshots(),
        listPlatformMediaAdminSnapshots(),
      ]);

    const notificationDeliveries = notifications.flatMap(
      (notification) => notification.deliveries,
    );

    return {
      resources: [
        {
          title: 'Support',
          href: '/platform/operations/support',
          description:
            'Review workspace and platform escalations, operator assignment, and thread activity.',
          totalCount: supportTickets.length,
          stats: `${supportTickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length} open - ${supportTickets.filter((ticket) => ticket.contextType === 'PLATFORM').length} platform escalations`,
        },
        {
          title: 'Notifications',
          href: '/platform/operations/notifications',
          description:
            'Trace recipient inbox records and channel-level delivery outcomes across the notification system.',
          totalCount: notifications.length,
          stats: `${notifications.filter((notification) => !notification.isRead).length} unread - ${notificationDeliveries.filter((delivery) => delivery.status === 'FAILED').length} failed deliveries`,
        },
        {
          title: 'Webhooks & Outbox',
          href: '/platform/operations/integrations',
          description:
            'Observe inbound provider events and outbound queued work with retry state and processing health.',
          totalCount: webhookEvents.length + outboxEvents.length,
          stats: `${webhookEvents.filter((event) => event.status === 'FAILED').length} webhook failures - ${outboxEvents.filter((event) => event.status === 'FAILED').length} outbox failures`,
        },
        {
          title: 'Media & Files',
          href: '/platform/operations/media',
          description:
            'Inspect uploaded assets, attachment usage, storage keys, and queued media processing jobs.',
          totalCount: media.length,
          stats: `${media.filter((item) => item.status === 'READY').length} ready - ${media.filter((item) => item.status === 'FAILED').length} failed`,
        },
      ],
    };
  });
}
