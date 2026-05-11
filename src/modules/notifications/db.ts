import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Notifications
 *
 * Used for:
 * - in-app alerts
 * - customer or identity inbox items
 */

export const notificationCrud = buildCud({
  model: 'Notification',
  workspaceScoped: false,
  softDelete: false,
});

export const notificationQueries = buildQueries({
  model: 'Notification',
  workspaceScoped: false,
});

/**
 * Notification deliveries
 *
 * Used for:
 * - email delivery attempts
 * - SMS delivery attempts
 * - future WhatsApp / push / webhook channel delivery state
 */

export const notificationDeliveryCrud = buildCud({
  model: 'NotificationDelivery',
  workspaceScoped: false,
  softDelete: false,
});

export const notificationDeliveryQueries = buildQueries({
  model: 'NotificationDelivery',
  workspaceScoped: false,
});
