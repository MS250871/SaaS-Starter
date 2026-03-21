import {
  notificationCrud,
  notificationQueries,
} from '@/modules/notifications/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { Notification } from '@/generated/prisma/client';

/**
 * Get notification by ID
 */
export async function getNotificationById(id: string) {
  return notificationQueries.byId(id);
}

/**
 * Create notification
 */
export async function createNotification(data: CreateInput<'Notification'>) {
  return notificationCrud.create(data);
}

/**
 * Create notification for identity
 */
export async function createIdentityNotification(params: {
  workspaceId: string;
  identityId: string;
  channel: string;
  payload: any;
}) {
  return notificationCrud.create({
    workspaceId: params.workspaceId,
    recipientIdentityId: params.identityId,
    channel: params.channel,
    payload: params.payload,
  });
}

/**
 * Create notification for customer
 */
export async function createCustomerNotification(params: {
  workspaceId: string;
  customerId: string;
  channel: string;
  payload: any;
}) {
  return notificationCrud.create({
    workspaceId: params.workspaceId,
    recipientCustomerId: params.customerId,
    channel: params.channel,
    payload: params.payload,
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string) {
  return notificationCrud.update(id, {
    isRead: true,
  });
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsRead(ids: string[]) {
  const updates = ids.map((id) =>
    notificationCrud.update(id, {
      isRead: true,
    }),
  );

  return Promise.all(updates);
}

/**
 * Delete notification
 */
export async function deleteNotification(id: string) {
  return notificationCrud.delete(id);
}

/**
 * List identity notifications
 */
export async function listIdentityNotifications(identityId: string) {
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
  return notificationQueries.count({
    recipientIdentityId: identityId,
    isRead: false,
  });
}

/**
 * Count unread notifications for customer
 */
export async function countUnreadCustomerNotifications(customerId: string) {
  return notificationQueries.count({
    recipientCustomerId: customerId,
    isRead: false,
  });
}

/**
 * Mark all notifications read for identity
 */
export async function markAllIdentityNotificationsRead(identityId: string) {
  const notifications = (await listIdentityNotifications(
    identityId,
  )) as Notification[];

  const updates = notifications.map((n) =>
    notificationCrud.update(n.id, {
      isRead: true,
    }),
  );

  return Promise.all(updates);
}

/**
 * Mark all notifications read for customer
 */
export async function markAllCustomerNotificationsRead(customerId: string) {
  const notifications = (await listCustomerNotifications(
    customerId,
  )) as Notification[];

  const updates = notifications.map((n) =>
    notificationCrud.update(n.id, {
      isRead: true,
    }),
  );

  return Promise.all(updates);
}
