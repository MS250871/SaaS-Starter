import { adminAuditLogCrud, adminAuditLogQueries } from '@/modules/audit/db';
import { AuditSource, AuditSeverity } from '@/generated/prisma/client';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string) {
  try {
    return await adminAuditLogQueries.byId(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to fetch audit log');
  }
}

/**
 * Create audit log
 */
export async function createAuditLog(data: CreateInput<'AdminAuditLog'>) {
  try {
    return await adminAuditLogCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create audit log');
  }
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
  try {
    return await adminAuditLogCrud.create({
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
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to log admin action');
  }
}

/**
 * Update audit log
 */
export async function updateAuditLog(
  id: string,
  data: UpdateInput<'AdminAuditLog'>,
) {
  try {
    return await adminAuditLogCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update audit log');
  }
}

/**
 * Delete audit log
 */
export async function deleteAuditLog(id: string) {
  try {
    return await adminAuditLogCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete audit log');
  }
}

/**
 * List workspace audit logs
 */
export async function listWorkspaceAuditLogs(workspaceId: string) {
  try {
    return await adminAuditLogQueries.many({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to list workspace audit logs');
  }
}

/**
 * List identity audit logs
 */
export async function listIdentityAuditLogs(identityId: string) {
  try {
    return await adminAuditLogQueries.many({
      where: {
        adminIdentityId: identityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to list identity audit logs');
  }
}

/**
 * Paginated audit logs
 */
export async function listAuditLogsPaginated(opts?: {
  page?: number;
  pageSize?: number;
}) {
  try {
    return await adminAuditLogQueries.paginated({
      page: opts?.page ?? 1,
      pageSize: opts?.pageSize ?? 20,
      sort: [
        {
          column: 'createdAt',
          dir: 'desc',
        },
      ],
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to list audit logs');
  }
}
