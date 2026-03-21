import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Notifications
 *
 * Used for:
 * - system notifications
 * - email notifications
 * - in-app alerts
 * - customer or identity messages
 */

export const notificationCrud = buildCud({
  model: 'Notification',
  workspaceScoped: true,
  softDelete: false,
});

export const notificationQueries = buildQueries({
  model: 'Notification',
  workspaceScoped: true,
});
