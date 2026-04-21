import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                             WEBHOOK EVENT                                  */
/* -------------------------------------------------------------------------- */

export const webhookEventCrud = buildCud({
  model: 'WebhookEvent',

  // global queue/audit table; rows may still reference workspace/customer/identity
  workspaceScoped: false,

  // no soft delete (audit log)
  softDelete: false,

  // no isActive
  activeField: undefined,
});

export const webhookEventQueries = buildQueries({
  model: 'WebhookEvent',

  workspaceScoped: false,

  // no active filter
});
