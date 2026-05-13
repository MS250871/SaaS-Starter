import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Customer (workspace end user)
 */
export const customerCrud = buildCud({
  model: 'Customer',
  workspaceScoped: false,
  softDelete: false,
});

export const customerQueries = buildQueries({
  model: 'Customer',
  workspaceScoped: false,
});
