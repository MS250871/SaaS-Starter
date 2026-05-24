import { withActionReadContext } from '@/lib/request/withActionContext';
import {
  countWorkspaceIdentityNotifications,
  listWorkspaceIdentityNotifications,
} from '@/modules/notifications/services/notification.services';
import { listWorkspaceCustomersDirectory } from '@/modules/customer/services/customer.services';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type WorkspaceInboxNotification = Awaited<
  ReturnType<typeof listWorkspaceIdentityNotifications>
>[number];
type WorkspaceInboxDelivery = WorkspaceInboxNotification['deliveries'][number];
type WorkspaceMemberWithRole = Awaited<
  ReturnType<typeof listActiveWorkspaceMembersWithRoles>
>[number];
type WorkspaceCustomerDirectoryEntry = Awaited<
  ReturnType<typeof listWorkspaceCustomersDirectory>
>[number];

function getNotificationHref(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const href = 'href' in payload ? payload.href : null;
  return typeof href === 'string' && href.trim().length > 0 ? href : null;
}

export async function getWorkspaceNotificationInboxData(params: {
  workspaceId: string;
  identityId: string;
  limit?: number;
}) {
  const [notifications, unreadCount] = await Promise.all([
    listWorkspaceIdentityNotifications({
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      limit: params.limit ?? 20,
      excludeTypes: ['workspace.notification.sent_summary'],
    }),
    countWorkspaceIdentityNotifications({
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      unreadOnly: true,
      excludeTypes: ['workspace.notification.sent_summary'],
    }),
  ]);

  return {
    unreadCount,
    items: notifications.map((notification: WorkspaceInboxNotification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title ?? 'Notification',
      body: notification.body ?? null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      href: getNotificationHref(notification.payload),
      deliveries: notification.deliveries.map((delivery: WorkspaceInboxDelivery) => ({
        id: delivery.id,
        channel: delivery.channel,
        status: delivery.status,
        recipient: delivery.recipient,
        subject: delivery.subject ?? null,
        errorMessage: delivery.errorMessage ?? null,
        sentAt: delivery.sentAt?.toISOString() ?? null,
        deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
        failedAt: delivery.failedAt?.toISOString() ?? null,
      })),
    })),
  };
}

export async function getWorkspaceNotificationsPageData() {
  return withActionReadContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId || !context.actor.identityId) {
      return {
        ...context,
        inboxNotifications: [],
        inboxSummary: {
          totalCount: 0,
          unreadCount: 0,
        },
        workspaceRecipients: [],
        customerRecipients: [],
      };
    }

    const [inboxData, totalCount, workspaceRecipients, customerRecipients] =
      await Promise.all([
        getWorkspaceNotificationInboxData({
          workspaceId: context.workspaceId,
          identityId: context.actor.identityId,
          limit: 50,
        }),
        countWorkspaceIdentityNotifications({
          workspaceId: context.workspaceId,
          identityId: context.actor.identityId,
        }),
        listActiveWorkspaceMembersWithRoles(context.workspaceId),
        listWorkspaceCustomersDirectory(context.workspaceId),
      ]);

    return {
      ...context,
      inboxNotifications: inboxData.items,
      inboxSummary: {
        totalCount,
        unreadCount: inboxData.unreadCount,
      },
      workspaceRecipients: workspaceRecipients
        .filter(
          (member: WorkspaceMemberWithRole) =>
            member.identityId !== context.actor.identityId,
        )
        .map((member: WorkspaceMemberWithRole) => ({
          id: member.identityId,
          name:
            `${member.identity.firstName ?? ''} ${
              member.identity.lastName ?? ''
            }`.trim() ||
            member.identity.email ||
            'Workspace member',
          email: member.identity.email ?? null,
        })),
      customerRecipients: customerRecipients.map(
        (customer: WorkspaceCustomerDirectoryEntry) => ({
          id: customer.id,
          name:
            `${customer.identity.firstName ?? ''} ${
              customer.identity.lastName ?? ''
            }`.trim() ||
            customer.identity.email ||
            'Customer',
          email: customer.identity.email ?? null,
        }),
      ),
    };
  });
}
