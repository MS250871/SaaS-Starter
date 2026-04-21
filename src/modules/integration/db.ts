import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                             WEBHOOK EVENT                                  */
/* -------------------------------------------------------------------------- */

export const webhookEventCrud = buildCud({
  model: 'WebhookEvent',

  // multi-tenant aware (can belong to workspace)
  workspaceScoped: true,

  // no soft delete (audit log)
  softDelete: false,

  // no isActive
  activeField: undefined,
});

export const webhookEventQueries = buildQueries({
  model: 'WebhookEvent',

  workspaceScoped: true,

  // no active filter
});
