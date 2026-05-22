import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformCustomerAdminSnapshots } from '@/modules/customer/services/customer.services';
import {
  getPlatformNotificationAdminSnapshot,
  listPlatformNotificationAdminSnapshots,
} from '@/modules/notifications/services/notification.services';
import { listPlatformWorkspaceMembershipAdminSnapshots } from '@/modules/workspace/services/membership.services';
import { listPlatformWorkspaceAdminSnapshots } from '@/modules/workspace/services/workspace.services';

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatIdentityName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    'Identity'
  );
}

function buildRecipientLabels(notification: Awaited<
  ReturnType<typeof getPlatformNotificationAdminSnapshot>
>) {
  if (notification.recipientCustomer) {
    return {
      recipientLabel: formatIdentityName({
        firstName: notification.recipientCustomer.identity.firstName,
        lastName: notification.recipientCustomer.identity.lastName,
        email: notification.recipientCustomer.identity.email,
      }),
      recipientSubLabel: notification.recipientCustomer.externalId
        ? `Customer ${notification.recipientCustomer.externalId}`
        : 'Workspace customer',
    };
  }

  if (notification.recipientIdentity) {
    return {
      recipientLabel: formatIdentityName(notification.recipientIdentity),
      recipientSubLabel: 'Identity recipient',
    };
  }

  return {
    recipientLabel: 'Unknown recipient',
    recipientSubLabel: 'No linked actor',
  };
}

function buildNotificationRow(
  notification: Awaited<ReturnType<typeof getPlatformNotificationAdminSnapshot>>,
) {
  const latestDelivery = notification.deliveries[0] ?? null;
  const recipient = buildRecipientLabels(notification);

  return {
    id: notification.id,
    workspaceId: notification.workspace?.id ?? null,
    workspaceName:
      notification.workspace?.name ??
      notification.recipientCustomer?.workspace?.name ??
      'Unscoped',
    workspaceSlug:
      notification.workspace?.slug ??
      notification.recipientCustomer?.workspace?.slug ??
      'N/A',
    workspaceIsActive: notification.workspace?.isActive ?? true,
    title: notification.title ?? 'Notification',
    type: notification.type,
    typeLabel: formatEnumLabel(notification.type),
    targetTypeLabel: formatEnumLabel(notification.targetType),
    recipientLabel: recipient.recipientLabel,
    recipientSubLabel: recipient.recipientSubLabel,
    isRead: notification.isRead,
    readLabel: notification.isRead ? 'Read' : 'Unread',
    latestDeliveryStatusLabel: latestDelivery
      ? formatEnumLabel(latestDelivery.status)
      : 'In App Only',
    deliveryCount: notification._count.deliveries,
    createdAtLabel: formatDate(notification.createdAt),
  };
}

export type PlatformNotificationRow = ReturnType<typeof buildNotificationRow>;

export type PlatformNotificationWorkspaceOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type PlatformNotificationRecipientOption = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  kind: 'workspace' | 'customer';
  subLabel: string;
};

export async function getPlatformNotificationsPageData() {
  return withActionTxContext(async () => {
    const [notifications, workspacePage, workspaceMemberships, customers] =
      await Promise.all([
        listPlatformNotificationAdminSnapshots(),
        listPlatformWorkspaceAdminSnapshots({
          page: 1,
          pageSize: 500,
        }),
        listPlatformWorkspaceMembershipAdminSnapshots({ limit: 1000 }),
        listPlatformCustomerAdminSnapshots({ limit: 1000 }),
      ]);
    const rows = notifications.map(buildNotificationRow);
    const allDeliveries = notifications.flatMap(
      (notification) => notification.deliveries,
    );
    const workspaceOptions: PlatformNotificationWorkspaceOption[] =
      workspacePage.items.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
      }));
    const workspaceRecipients: PlatformNotificationRecipientOption[] =
      workspaceMemberships.map((membership) => ({
        id: membership.identityId,
        workspaceId: membership.workspaceId,
        kind: 'workspace',
        name:
          `${membership.identity.firstName ?? ''} ${
            membership.identity.lastName ?? ''
          }`.trim() ||
          membership.identity.email ||
          'Workspace member',
        email: membership.identity.email ?? null,
        subLabel: membership.roleDefinition.name,
      }));
    const customerRecipients: PlatformNotificationRecipientOption[] =
      customers.map((customer) => ({
        id: customer.id,
        workspaceId: customer.workspaceId,
        kind: 'customer',
        name:
          `${customer.identity.firstName ?? ''} ${
            customer.identity.lastName ?? ''
          }`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
        subLabel: customer.externalId
          ? `Customer ${customer.externalId}`
          : customer.workspace.name,
      }));

    return {
      summary: {
        total: rows.length,
        unread: rows.filter((row) => !row.isRead).length,
        failedDeliveries: allDeliveries.filter(
          (delivery) => delivery.status === 'FAILED',
        ).length,
        pendingDeliveries: allDeliveries.filter((delivery) =>
          ['PENDING', 'PROCESSING', 'SENT'].includes(delivery.status),
        ).length,
      },
      workspaceOptions,
      workspaceRecipients,
      customerRecipients,
      rows,
    };
  });
}

export async function getPlatformNotificationDetailPageData(notificationId: string) {
  return withActionTxContext(async () => {
    const notification = await getPlatformNotificationAdminSnapshot(notificationId);
    const row = buildNotificationRow(notification);
    const recipient = buildRecipientLabels(notification);

    return {
      notification: {
        ...row,
        body: notification.body ?? '',
        payloadJson: JSON.stringify(notification.payload ?? {}, null, 2),
        recipientLabel: recipient.recipientLabel,
        recipientSubLabel: recipient.recipientSubLabel,
      },
      deliveries: notification.deliveries.map((delivery) => ({
        id: delivery.id,
        channelLabel: formatEnumLabel(delivery.channel),
        providerLabel: delivery.provider ?? 'Direct',
        status: delivery.status,
        statusLabel: formatEnumLabel(delivery.status),
        recipient: delivery.recipient,
        subject: delivery.subject ?? 'N/A',
        errorMessage: delivery.errorMessage ?? 'N/A',
        sentAtLabel: formatDate(delivery.sentAt),
        deliveredAtLabel: formatDate(delivery.deliveredAt),
        failedAtLabel: formatDate(delivery.failedAt),
        createdAtLabel: formatDate(delivery.createdAt),
        canReplay: ['FAILED', 'PENDING'].includes(delivery.status),
      })),
    };
  });
}
