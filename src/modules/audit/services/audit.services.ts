import { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { maybeGetRequestContext } from '@/lib/context/request-context';
import { prisma } from '@/lib/prisma';
import type {
  AuditEventRecord,
} from '@/modules/audit/audit.types';

type AuditSourceText =
  | 'ADMIN_PANEL'
  | 'WORKSPACE_APP'
  | 'CUSTOMER_APP'
  | 'AUTH'
  | 'API'
  | 'WEBHOOK'
  | 'JOB'
  | 'SYSTEM';

type AuditSeverityText = 'INFO' | 'WARNING' | 'ERROR';

type PlatformAdminAuditSnapshotRow = {
  id: string;
  actorIdentityId: string | null;
  actorEmail: string | null;
  actorPlatformRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  source: AuditSourceText;
  severity: AuditSeverityText;
  createdAt: Date;
  requestId: string | null;
  adminFirstName: string | null;
  adminLastName: string | null;
  adminEmailResolved: string | null;
  adminPhone: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceSlug: string | null;
};

export type PlatformAdminAuditSnapshot = {
  id: string;
  actorIdentityId: string | null;
  actorEmail: string | null;
  actorPlatformRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  source: AuditSourceText;
  severity: AuditSeverityText;
  createdAt: Date;
  requestId: string | null;
  actorIdentity: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function getDb() {
  return maybeGetRequestContext()?.prisma ?? prisma;
}

export async function getAuditEventById(id: string) {
  const db = getDb();

  try {
    const rows = await db.$queryRaw<AuditEventRecord[]>(Prisma.sql`
      SELECT
        "id",
        "scope"::text AS "scope",
        "category"::text AS "category",
        "source"::text AS "source",
        "outcome"::text AS "outcome",
        "severity"::text AS "severity",
        "action",
        "entity_type" AS "entityType",
        "entity_id" AS "entityId",
        "description",
        "reason",
        "workspace_id" AS "workspaceId",
        "customer_id" AS "customerId",
        "actor_type"::text AS "actorType",
        "actor_identity_id" AS "actorIdentityId",
        "actor_customer_id" AS "actorCustomerId",
        "actor_api_key_id" AS "actorApiKeyId",
        "session_id" AS "sessionId",
        "actor_email" AS "actorEmail",
        "actor_name" AS "actorName",
        "actor_platform_role" AS "actorPlatformRole",
        "actor_workspace_role" AS "actorWorkspaceRole",
        "request_id" AS "requestId",
        "ip_address" AS "ipAddress",
        "user_agent" AS "userAgent",
        "request_path" AS "requestPath",
        "request_method" AS "requestMethod",
        "old_value" AS "oldValue",
        "new_value" AS "newValue",
        "metadata",
        "created_at" AS "createdAt"
      FROM "AuditEvent"
      WHERE "id" = ${id}::uuid
      LIMIT 1
    `);

    return rows[0] ?? null;
  } catch {
    throwError(ERR.DB_ERROR, 'Failed to fetch audit event');
  }
}

export async function listWorkspaceAuditLogs(workspaceId: string) {
  const db = getDb();

  try {
    return await db.$queryRaw<AuditEventRecord[]>(Prisma.sql`
      SELECT
        "id",
        "scope"::text AS "scope",
        "category"::text AS "category",
        "source"::text AS "source",
        "outcome"::text AS "outcome",
        "severity"::text AS "severity",
        "action",
        "entity_type" AS "entityType",
        "entity_id" AS "entityId",
        "description",
        "reason",
        "workspace_id" AS "workspaceId",
        "customer_id" AS "customerId",
        "actor_type"::text AS "actorType",
        "actor_identity_id" AS "actorIdentityId",
        "actor_customer_id" AS "actorCustomerId",
        "actor_api_key_id" AS "actorApiKeyId",
        "session_id" AS "sessionId",
        "actor_email" AS "actorEmail",
        "actor_name" AS "actorName",
        "actor_platform_role" AS "actorPlatformRole",
        "actor_workspace_role" AS "actorWorkspaceRole",
        "request_id" AS "requestId",
        "ip_address" AS "ipAddress",
        "user_agent" AS "userAgent",
        "request_path" AS "requestPath",
        "request_method" AS "requestMethod",
        "old_value" AS "oldValue",
        "new_value" AS "newValue",
        "metadata",
        "created_at" AS "createdAt"
      FROM "AuditEvent"
      WHERE "workspace_id" = ${workspaceId}::uuid
      ORDER BY "created_at" DESC
    `);
  } catch {
    throwError(ERR.DB_ERROR, 'Failed to list workspace audit logs');
  }
}

export async function listIdentityAuditLogs(identityId: string) {
  const db = getDb();

  try {
    return await db.$queryRaw<AuditEventRecord[]>(Prisma.sql`
      SELECT
        "id",
        "scope"::text AS "scope",
        "category"::text AS "category",
        "source"::text AS "source",
        "outcome"::text AS "outcome",
        "severity"::text AS "severity",
        "action",
        "entity_type" AS "entityType",
        "entity_id" AS "entityId",
        "description",
        "reason",
        "workspace_id" AS "workspaceId",
        "customer_id" AS "customerId",
        "actor_type"::text AS "actorType",
        "actor_identity_id" AS "actorIdentityId",
        "actor_customer_id" AS "actorCustomerId",
        "actor_api_key_id" AS "actorApiKeyId",
        "session_id" AS "sessionId",
        "actor_email" AS "actorEmail",
        "actor_name" AS "actorName",
        "actor_platform_role" AS "actorPlatformRole",
        "actor_workspace_role" AS "actorWorkspaceRole",
        "request_id" AS "requestId",
        "ip_address" AS "ipAddress",
        "user_agent" AS "userAgent",
        "request_path" AS "requestPath",
        "request_method" AS "requestMethod",
        "old_value" AS "oldValue",
        "new_value" AS "newValue",
        "metadata",
        "created_at" AS "createdAt"
      FROM "AuditEvent"
      WHERE "actor_identity_id" = ${identityId}::uuid
      ORDER BY "created_at" DESC
    `);
  } catch {
    throwError(ERR.DB_ERROR, 'Failed to list identity audit logs');
  }
}

export async function listAuditLogsPaginated(opts?: {
  page?: number;
  pageSize?: number;
}) {
  const db = getDb();

  try {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countRows, items] = await Promise.all([
      db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count"
        FROM "AuditEvent"
      `),
      db.$queryRaw<AuditEventRecord[]>(Prisma.sql`
        SELECT
          "id",
          "scope"::text AS "scope",
          "category"::text AS "category",
          "source"::text AS "source",
          "outcome"::text AS "outcome",
          "severity"::text AS "severity",
          "action",
          "entity_type" AS "entityType",
          "entity_id" AS "entityId",
          "description",
          "reason",
          "workspace_id" AS "workspaceId",
          "customer_id" AS "customerId",
          "actor_type"::text AS "actorType",
          "actor_identity_id" AS "actorIdentityId",
          "actor_customer_id" AS "actorCustomerId",
          "actor_api_key_id" AS "actorApiKeyId",
          "session_id" AS "sessionId",
          "actor_email" AS "actorEmail",
          "actor_name" AS "actorName",
          "actor_platform_role" AS "actorPlatformRole",
          "actor_workspace_role" AS "actorWorkspaceRole",
          "request_id" AS "requestId",
          "ip_address" AS "ipAddress",
          "user_agent" AS "userAgent",
          "request_path" AS "requestPath",
          "request_method" AS "requestMethod",
          "old_value" AS "oldValue",
          "new_value" AS "newValue",
          "metadata",
          "created_at" AS "createdAt"
        FROM "AuditEvent"
        ORDER BY "created_at" DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `),
    ]);

    const totalItems = Number(countRows[0]?.count ?? BigInt(0));

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  } catch {
    throwError(ERR.DB_ERROR, 'Failed to list audit logs');
  }
}

export async function listPlatformAdminAuditSnapshots(opts?: {
  limit?: number;
}) {
  const db = getDb();

  try {
    const rows = await db.$queryRaw<PlatformAdminAuditSnapshotRow[]>(Prisma.sql`
      SELECT
        ae."id",
        ae."actor_identity_id" AS "actorIdentityId",
        ae."actor_email" AS "actorEmail",
        ae."actor_platform_role" AS "actorPlatformRole",
        ae."action",
        ae."entity_type" AS "entityType",
        ae."entity_id" AS "entityId",
        ae."description",
        ae."source"::text AS "source",
        ae."severity"::text AS "severity",
        ae."created_at" AS "createdAt",
        ae."request_id" AS "requestId",
        identity."first_name" AS "adminFirstName",
        identity."last_name" AS "adminLastName",
        identity."email" AS "adminEmailResolved",
        identity."phone" AS "adminPhone",
        workspace."id" AS "workspaceId",
        workspace."name" AS "workspaceName",
        workspace."slug" AS "workspaceSlug"
      FROM "AuditEvent" ae
      LEFT JOIN "Identity" identity
        ON identity."id" = ae."actor_identity_id"
      LEFT JOIN "Workspace" workspace
        ON workspace."id" = ae."workspace_id"
      WHERE ae."source" = 'ADMIN_PANEL'
      ORDER BY ae."created_at" DESC
      LIMIT ${opts?.limit ?? 500}
    `);

    return rows.map<PlatformAdminAuditSnapshot>((row) => ({
      id: row.id,
      actorIdentityId: row.actorIdentityId,
      actorEmail: row.actorEmail,
      actorPlatformRole: row.actorPlatformRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      description: row.description,
      source: row.source,
      severity: row.severity,
      createdAt: row.createdAt,
      requestId: row.requestId,
      actorIdentity: row.actorIdentityId
        ? {
            id: row.actorIdentityId,
            firstName: row.adminFirstName,
            lastName: row.adminLastName,
            email: row.adminEmailResolved,
            phone: row.adminPhone,
          }
        : null,
      workspace: row.workspaceId
        ? {
            id: row.workspaceId,
            name: row.workspaceName ?? 'Unknown workspace',
            slug: row.workspaceSlug ?? 'unknown',
          }
        : null,
    }));
  } catch {
    throwError(ERR.DB_ERROR, 'Failed to list platform audit logs');
  }
}
