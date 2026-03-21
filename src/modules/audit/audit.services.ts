import { adminAuditLogCrud, adminAuditLogQueries } from '@/modules/audit/db';
import { AuditSource, AuditSeverity } from '@/generated/prisma/client';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string) {
  return adminAuditLogQueries.byId(id);
}

/**
 * Create audit log
 */
export async function createAuditLog(data: CreateInput<'AdminAuditLog'>) {
  return adminAuditLogCrud.create(data);
}

/**
 * Log admin action
 */
export async function logAdminAction(params: {
  adminIdentityId: string;
  workspaceId?: string | null;
  adminEmail?: string | null;
  adminRole?: string | null;

  action: string;
  entityType: string;
  entityId: string;

  description?: string;

  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;

  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  source?: AuditSource;
  severity?: AuditSeverity;
}) {
  return adminAuditLogCrud.create({
    adminIdentityId: params.adminIdentityId,
    workspaceId: params.workspaceId ?? undefined,
    adminEmail: params.adminEmail ?? undefined,
    adminRole: params.adminRole ?? undefined,

    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,

    description: params.description,

    oldValue: params.oldValue,
    newValue: params.newValue,

    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    requestId: params.requestId,

    source: params.source ?? AuditSource.ADMIN_PANEL,
    severity: params.severity ?? AuditSeverity.INFO,
  });
}

/**
 * Update audit log
 */
export async function updateAuditLog(
  id: string,
  data: UpdateInput<'AdminAuditLog'>,
) {
  return adminAuditLogCrud.update(id, data);
}

/**
 * Delete audit log
 */
export async function deleteAuditLog(id: string) {
  return adminAuditLogCrud.delete(id);
}

/**
 * List workspace audit logs
 */
export async function listWorkspaceAuditLogs(workspaceId: string) {
  return adminAuditLogQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List identity audit logs
 */
export async function listIdentityAuditLogs(identityId: string) {
  return adminAuditLogQueries.many({
    where: {
      adminIdentityId: identityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Paginated audit logs
 */
export async function listAuditLogsPaginated(opts?: {
  page?: number;
  pageSize?: number;
}) {
  return adminAuditLogQueries.paginated({
    page: opts?.page ?? 1,
    pageSize: opts?.pageSize ?? 20,
    sort: [
      {
        column: 'createdAt',
        dir: 'desc',
      },
    ],
  });
}
