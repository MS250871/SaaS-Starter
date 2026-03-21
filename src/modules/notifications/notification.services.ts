import {
  notificationCrud,
  notificationQueries,
} from '@/modules/notifications/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { Notification } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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
 * Create notification
 */
export async function createNotification(data: CreateInput<'Notification'>) {
  if (!data?.workspaceId || !data?.channel || !data?.payload) {
    throwError(ERR.INVALID_INPUT, 'Invalid notification payload');
  }

  try {
    return await notificationCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create notification', undefined, e);
  }
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
  if (!params.workspaceId || !params.identityId || !params.channel) {
    throwError(ERR.INVALID_INPUT, 'Invalid identity notification params');
  }

  try {
    return await notificationCrud.create({
      workspaceId: params.workspaceId,
      recipientIdentityId: params.identityId,
      channel: params.channel,
      payload: params.payload,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create identity notification',
      undefined,
      e,
    );
  }
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
  if (!params.workspaceId || !params.customerId || !params.channel) {
    throwError(ERR.INVALID_INPUT, 'Invalid customer notification params');
  }

  try {
    return await notificationCrud.create({
      workspaceId: params.workspaceId,
      recipientCustomerId: params.customerId,
      channel: params.channel,
      payload: params.payload,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create customer notification',
      undefined,
      e,
    );
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Notification ID is required');

  try {
    return await notificationCrud.update(id, {
      isRead: true,
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
  if (!customerId) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

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
