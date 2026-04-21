import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                              OUTBOX EVENT                                  */
/* -------------------------------------------------------------------------- */

export const outboxEventCrud = buildCud({
  model: 'OutboxEvent',

  // can belong to workspace → important for RLS
  workspaceScoped: false,

  // never soft delete → audit + retry safety
  softDelete: false,

  // no isActive
  activeField: undefined,
});

export const outboxEventQueries = buildQueries({
  model: 'OutboxEvent',

  workspaceScoped: false,
});
