import {
  notificationCrud,
  notificationDeliveryCrud,
  notificationDeliveryQueries,
  notificationQueries,
} from '@/modules/notifications/db';
import { customerQueries, identityQueries } from '@/modules/auth/db';

import type { CreateInput } from '@/lib/crud/prisma-types';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationTargetType,
} from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type DeliveryRecipientResolution = {
  recipient: string;
  provider: string | null;
};

export type CreateNotificationDeliveryInput = {
  channel: NotificationChannel;
  recipient: string;
  subject?: string | null;
  content?: string | null;
  payload?: Prisma.InputJsonValue;
  provider?: string | null;
  status?: NotificationDeliveryStatus;
};

export type CreateNotificationWithDeliveriesInput = {
  workspaceId?: string | null;
  recipientIdentityId?: string | null;
  recipientCustomerId?: string | null;
  targetType: NotificationTargetType;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
  deliveries?: CreateNotificationDeliveryInput[];
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getDefaultProvider(channel: NotificationChannel) {
  if (channel === NotificationChannel.EMAIL) {
    return 'resend';
  }

  if (channel === NotificationChannel.SMS) {
    return 'combirds';
  }

  if (channel === NotificationChannel.WHATSAPP) {
    return 'whatsapp';
  }

  return null;
}

/**
 * Get notification by ID
 */
export async function getNotificationById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Notification ID is required');

  const notification = await notificationQueries.byId(id);

  if (!notification) {
    throwError(ERR.NOT_FOUND, 'Notification not found');
  }

  return notification;
}

/**
 * Get notification delivery by ID
 */
export async function getNotificationDeliveryById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
  }

  const delivery = await notificationDeliveryQueries.byId(id);

  if (!delivery) {
    throwError(ERR.NOT_FOUND, 'Notification delivery not found');
  }

  return delivery;
}

/**
 * Create notification record
 */
export async function createNotification(data: CreateInput<'Notification'>) {
  if (!data?.targetType || !data?.type || data.payload === undefined) {
    throwError(ERR.INVALID_INPUT, 'Invalid notification payload');
  }

  try {
    return await notificationCrud.create({
      ...data,
      isRead: data.isRead ?? false,
      readAt: data.readAt ?? null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create notification', undefined, e);
  }
}

/**
 * Create notification delivery record
 */
export async function createNotificationDelivery(
  data: CreateInput<'NotificationDelivery'>,
) {
  if (!data?.notificationId || !data?.channel || !data?.recipient) {
    throwError(ERR.INVALID_INPUT, 'Invalid notification delivery payload');
  }

  try {
    return await notificationDeliveryCrud.create({
      ...data,
      provider: data.provider ?? getDefaultProvider(data.channel),
      status: data.status ?? NotificationDeliveryStatus.PENDING,
      subject: data.subject ?? null,
      content: data.content ?? null,
      payload: data.payload ?? undefined,
      providerMessageId: data.providerMessageId ?? null,
      errorMessage: data.errorMessage ?? null,
      sentAt: data.sentAt ?? null,
      deliveredAt: data.deliveredAt ?? null,
      failedAt: data.failedAt ?? null,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create notification delivery',
      undefined,
      e,
    );
  }
}

/**
 * Create notification with optional delivery rows
 */
export async function createNotificationWithDeliveries(
  params: CreateNotificationWithDeliveriesInput,
) {
  if (!params.type || params.payload === undefined) {
    throwError(
      ERR.INVALID_INPUT,
      'Notification type and payload are required',
    );
  }

  if (!params.recipientIdentityId && !params.recipientCustomerId) {
    throwError(
      ERR.INVALID_INPUT,
      'Notification recipient identity or customer is required',
    );
  }

  const notification = await createNotification({
    workspaceId: params.workspaceId ?? undefined,
    recipientIdentityId: params.recipientIdentityId ?? undefined,
    recipientCustomerId: params.recipientCustomerId ?? undefined,
    targetType: params.targetType,
    type: params.type,
    title: params.title ?? null,
    body: params.body ?? null,
    payload: params.payload,
  });

  const deliveries = await Promise.all(
    (params.deliveries ?? []).map((delivery) =>
      createNotificationDelivery({
        notificationId: notification.id,
        workspaceId: params.workspaceId ?? undefined,
        channel: delivery.channel,
        recipient: delivery.recipient,
        subject: delivery.subject ?? params.title ?? null,
        content: delivery.content ?? params.body ?? null,
        payload: delivery.payload ?? undefined,
        provider: delivery.provider ?? undefined,
        status: delivery.status ?? undefined,
      }),
    ),
  );

  return {
    notification,
    deliveries,
  };
}

/**
 * Create notification for identity
 */
export async function createIdentityNotification(params: {
  workspaceId?: string | null;
  identityId: string;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  if (!params.identityId || !params.type) {
    throwError(ERR.INVALID_INPUT, 'Invalid identity notification params');
  }

  return createNotification({
    workspaceId: params.workspaceId ?? undefined,
    recipientIdentityId: params.identityId,
    targetType: NotificationTargetType.IDENTITY,
    type: params.type,
    title: params.title ?? null,
    body: params.body ?? null,
    payload: params.payload ?? {},
  });
}

/**
 * Create notification for customer
 */
export async function createCustomerNotification(params: {
  workspaceId?: string | null;
  customerId: string;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
}) {
  if (!params.customerId || !params.type) {
    throwError(ERR.INVALID_INPUT, 'Invalid customer notification params');
  }

  return createNotification({
    workspaceId: params.workspaceId ?? undefined,
    recipientCustomerId: params.customerId,
    targetType: NotificationTargetType.CUSTOMER,
    type: params.type,
    title: params.title ?? null,
    body: params.body ?? null,
    payload: params.payload ?? {},
  });
}

/**
 * Resolve recipient contact for delivery channel
 */
export async function resolveNotificationRecipientForChannel(params: {
  channel: NotificationChannel;
  recipientIdentityId?: string | null;
  recipientCustomerId?: string | null;
}) {
  if (
    params.channel === NotificationChannel.IN_APP &&
    !params.recipientIdentityId &&
    !params.recipientCustomerId
  ) {
    throwError(
      ERR.INVALID_INPUT,
      'In-app notification requires a recipient identity or customer',
    );
  }

  if (params.recipientCustomerId) {
    const customer = await customerQueries.findFirst({
      where: {
        id: params.recipientCustomerId,
      },
      select: {
        id: true,
        identity: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!customer) {
      throwError(ERR.NOT_FOUND, 'Notification customer recipient not found');
    }

    if (params.channel === NotificationChannel.IN_APP) {
      return {
        recipient: customer.id,
        provider: null,
      } satisfies DeliveryRecipientResolution;
    }

    if (params.channel === NotificationChannel.EMAIL) {
      if (!customer.identity.email) {
        throwError(ERR.INVALID_STATE, 'Customer does not have an email address');
      }

      return {
        recipient: normalizeEmail(customer.identity.email),
        provider: getDefaultProvider(params.channel),
      } satisfies DeliveryRecipientResolution;
    }

    if (params.channel === NotificationChannel.SMS) {
      if (!customer.identity.phone) {
        throwError(ERR.INVALID_STATE, 'Customer does not have a phone number');
      }

      return {
        recipient: customer.identity.phone,
        provider: getDefaultProvider(params.channel),
      } satisfies DeliveryRecipientResolution;
    }
  }

  if (params.recipientIdentityId) {
    const identity = await identityQueries.findFirst({
      where: {
        id: params.recipientIdentityId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    if (!identity) {
      throwError(ERR.NOT_FOUND, 'Notification identity recipient not found');
    }

    if (params.channel === NotificationChannel.IN_APP) {
      return {
        recipient: identity.id,
        provider: null,
      } satisfies DeliveryRecipientResolution;
    }

    if (params.channel === NotificationChannel.EMAIL) {
      if (!identity.email) {
        throwError(ERR.INVALID_STATE, 'Identity does not have an email address');
      }

      return {
        recipient: normalizeEmail(identity.email),
        provider: getDefaultProvider(params.channel),
      } satisfies DeliveryRecipientResolution;
    }

    if (params.channel === NotificationChannel.SMS) {
      if (!identity.phone) {
        throwError(ERR.INVALID_STATE, 'Identity does not have a phone number');
      }

      return {
        recipient: identity.phone,
        provider: getDefaultProvider(params.channel),
      } satisfies DeliveryRecipientResolution;
    }
  }

  if (params.channel === NotificationChannel.WHATSAPP) {
    throwError(
      ERR.INVALID_STATE,
      'WhatsApp delivery recipient resolution is not implemented yet',
    );
  }

  throwError(
    ERR.INVALID_INPUT,
    'Unable to resolve notification recipient for the selected channel',
  );
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Notification ID is required');

  try {
    return await notificationCrud.update(id, {
      isRead: true,
      readAt: new Date(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to mark notification read', undefined, e);
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsRead(ids: string[]) {
  if (!ids || ids.length === 0) {
    throwError(ERR.INVALID_INPUT, 'Notification IDs are required');
  }

  const readAt = new Date();
  const updates = ids.map((id) =>
    notificationCrud.update(id, {
      isRead: true,
      readAt,
    }),
  );

  return Promise.all(updates);
}

/**
 * Delete notification
 */
export async function deleteNotification(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Notification ID is required');

  try {
    return await notificationCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete notification', undefined, e);
  }
}

/**
 * List identity notifications
 */
export async function listIdentityNotifications(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return notificationQueries.many({
    where: {
      recipientIdentityId: identityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List customer notifications
 */
export async function listCustomerNotifications(customerId: string) {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  return notificationQueries.many({
    where: {
      recipientCustomerId: customerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Count unread notifications for identity
 */
export async function countUnreadIdentityNotifications(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return notificationQueries.count({
    recipientIdentityId: identityId,
    isRead: false,
  });
}

/**
 * Count unread notifications for customer
 */
export async function countUnreadCustomerNotifications(customerId: string) {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  return notificationQueries.count({
    recipientCustomerId: customerId,
    isRead: false,
  });
}

/**
 * Mark all notifications read for identity
 */
export async function markAllIdentityNotificationsRead(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const notifications = (await listIdentityNotifications(identityId)) as Array<{
    id: string;
  }>;

  const updates = notifications.map((notification) =>
    notificationCrud.update(notification.id, {
      isRead: true,
      readAt: new Date(),
    }),
  );

  return Promise.all(updates);
}

/**
 * Mark all notifications read for customer
 */
export async function markAllCustomerNotificationsRead(customerId: string) {
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  const notifications = (await listCustomerNotifications(customerId)) as Array<{
    id: string;
  }>;

  const updates = notifications.map((notification) =>
    notificationCrud.update(notification.id, {
      isRead: true,
      readAt: new Date(),
    }),
  );

  return Promise.all(updates);
}

/**
 * Mark delivery as processing
 */
export async function markNotificationDeliveryProcessing(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
  }

  try {
    return await notificationDeliveryCrud.update(id, {
      status: NotificationDeliveryStatus.PROCESSING,
      errorMessage: null,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to mark notification delivery processing',
      undefined,
      e,
    );
  }
}

/**
 * Mark delivery as sent
 */
export async function markNotificationDeliverySent(params: {
  id: string;
  providerMessageId?: string | null;
}) {
  if (!params.id) {
    throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
  }

  const sentAt = new Date();

  try {
    return await notificationDeliveryCrud.update(params.id, {
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: params.providerMessageId ?? null,
      sentAt,
      errorMessage: null,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to mark notification delivery sent',
      undefined,
      e,
    );
  }
}

/**
 * Mark delivery as delivered
 */
export async function markNotificationDeliveryDelivered(params: {
  id: string;
  providerMessageId?: string | null;
}) {
  if (!params.id) {
    throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
  }

  const deliveredAt = new Date();

  try {
    return await notificationDeliveryCrud.update(params.id, {
      status: NotificationDeliveryStatus.DELIVERED,
      providerMessageId: params.providerMessageId ?? null,
      deliveredAt,
      errorMessage: null,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to mark notification delivery delivered',
      undefined,
      e,
    );
  }
}

/**
 * Mark delivery as failed
 */
export async function markNotificationDeliveryFailed(params: {
  id: string;
  errorMessage: string;
}) {
  if (!params.id || !params.errorMessage) {
    throwError(
      ERR.INVALID_INPUT,
      'Notification delivery ID and errorMessage are required',
    );
  }

  try {
    return await notificationDeliveryCrud.update(params.id, {
      status: NotificationDeliveryStatus.FAILED,
      failedAt: new Date(),
      errorMessage: params.errorMessage,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to mark notification delivery failed',
      undefined,
      e,
    );
  }
}
