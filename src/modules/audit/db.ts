import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/**
 * Admin Audit Logs
 */
export const adminAuditLogCrud = buildCud({
  model: 'AdminAuditLog',
  workspaceScoped: false,
  softDelete: false,
});

export const adminAuditLogQueries = buildQueries({
  model: 'AdminAuditLog',
  workspaceScoped: false,
});
