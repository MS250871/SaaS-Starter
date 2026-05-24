import { randomUUID } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { maybeGetActor } from '@/lib/context/actor-context';
import { maybeGetRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { sanitizeAuditPayload } from '@/modules/audit/audit-redaction';
import type {
  AuditActorType,
  AuditEventInput,
  AuditEventRecord,
  AuditScope,
  AuditSource,
  AuditSeverity,
  NormalizedAuditEventInput,
} from '@/modules/audit/audit.types';

function mapActorTypeToAuditActorType(
  actorType: 'identity' | 'customer' | 'api_key' | 'system' | undefined,
): AuditActorType {
  switch (actorType) {
    case 'customer':
      return 'CUSTOMER';
    case 'api_key':
      return 'API_KEY';
    case 'system':
      return 'SYSTEM';
    case 'identity':
    default:
      return 'IDENTITY';
  }
}

function inferAuditScope(): AuditScope {
  const actor = maybeGetActor();
  const requestContext = maybeGetRequestContext();

  if (actor?.customerId) {
    return 'CUSTOMER';
  }

  if (actor?.workspaceId || requestContext?.workspace?.workspaceId) {
    return 'WORKSPACE';
  }

  if (actor?.platformRole || actor?.isPlatformAdmin) {
    return 'PLATFORM';
  }

  return 'SYSTEM';
}

function inferAuditSource(): AuditSource {
  const actor = maybeGetActor();
  const requestContext = maybeGetRequestContext();
  const path = requestContext?.path ?? '';

  if (
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/verify-otp') ||
    path.startsWith('/create-workspace')
  ) {
    return 'AUTH';
  }

  if (actor?.customerId) {
    return 'CUSTOMER_APP';
  }

  if (actor?.workspaceId) {
    return 'WORKSPACE_APP';
  }

  if (actor?.platformRole || actor?.isPlatformAdmin) {
    return 'ADMIN_PANEL';
  }

  return 'SYSTEM';
}

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function resolveDefaultSeverity(
  severity: AuditSeverity | undefined,
  outcome: NormalizedAuditEventInput['outcome'],
) {
  if (severity) {
    return severity;
  }

  if (outcome === 'DENIED') {
    return 'WARNING' as const;
  }

  if (outcome === 'FAILURE') {
    return 'ERROR' as const;
  }

  return 'INFO' as const;
}

export function normalizeAuditEventInput(
  input: AuditEventInput,
): NormalizedAuditEventInput {
  const actor = maybeGetActor();
  const requestContext = maybeGetRequestContext();
  const outcome = input.outcome ?? 'SUCCESS';

  return {
    scope:
      input.scope ??
      (input.customerId ? 'CUSTOMER' : undefined) ??
      (input.workspaceId ? 'WORKSPACE' : undefined) ??
      inferAuditScope(),
    category: input.category,
    source: input.source ?? inferAuditSource(),
    outcome,
    severity: resolveDefaultSeverity(input.severity, outcome),
    action: input.action,
    entityType: input.entityType,
    entityId: normalizeNullableText(input.entityId),
    description: normalizeNullableText(input.description),
    reason: normalizeNullableText(input.reason),
    workspaceId:
      input.workspaceId ??
      actor?.workspaceId ??
      requestContext?.workspace?.workspaceId ??
      null,
    customerId: input.customerId ?? null,
    actorType:
      input.actorType ?? mapActorTypeToAuditActorType(actor?.actorType),
    actorIdentityId: input.actorIdentityId ?? actor?.identityId ?? null,
    actorCustomerId: input.actorCustomerId ?? actor?.customerId ?? null,
    actorApiKeyId: input.actorApiKeyId ?? actor?.apiKeyId ?? null,
    sessionId: input.sessionId ?? requestContext?.session?.sessionId ?? null,
    actorEmail: normalizeNullableText(input.actorEmail),
    actorName: normalizeNullableText(input.actorName),
    actorPlatformRole:
      normalizeNullableText(input.actorPlatformRole) ??
      normalizeNullableText(actor?.platformRole),
    actorWorkspaceRole:
      normalizeNullableText(input.actorWorkspaceRole) ??
      normalizeNullableText(actor?.workspaceRole),
    requestId:
      normalizeNullableText(input.requestId) ??
      normalizeNullableText(requestContext?.requestId),
    ipAddress:
      normalizeNullableText(input.ipAddress) ??
      normalizeNullableText(requestContext?.ip),
    userAgent:
      normalizeNullableText(input.userAgent) ??
      normalizeNullableText(requestContext?.userAgent),
    requestPath:
      normalizeNullableText(input.requestPath) ??
      normalizeNullableText(requestContext?.path),
    requestMethod:
      normalizeNullableText(input.requestMethod) ??
      normalizeNullableText(requestContext?.method),
    oldValue: sanitizeAuditPayload(input.oldValue),
    newValue: sanitizeAuditPayload(input.newValue),
    metadata: sanitizeAuditPayload(input.metadata),
  };
}

function toJsonParameter(value: Prisma.InputJsonValue | null) {
  if (value === null) {
    return null;
  }

  return JSON.stringify(value);
}

export async function createAuditEvent(input: AuditEventInput) {
  const db = maybeGetRequestContext()?.prisma ?? prisma;
  const data = normalizeAuditEventInput(input);
  const eventId = randomUUID();
  const oldValueJson = toJsonParameter(data.oldValue);
  const newValueJson = toJsonParameter(data.newValue);
  const metadataJson = toJsonParameter(data.metadata);

  try {
    const rows = await db.$queryRaw<AuditEventRecord[]>(Prisma.sql`
      INSERT INTO "AuditEvent" (
        "id",
        "scope",
        "category",
        "source",
        "outcome",
        "severity",
        "action",
        "entity_type",
        "entity_id",
        "description",
        "reason",
        "workspace_id",
        "customer_id",
        "actor_type",
        "actor_identity_id",
        "actor_customer_id",
        "actor_api_key_id",
        "session_id",
        "actor_email",
        "actor_name",
        "actor_platform_role",
        "actor_workspace_role",
        "request_id",
        "ip_address",
        "user_agent",
        "request_path",
        "request_method",
        "old_value",
        "new_value",
        "metadata"
      )
      VALUES (
        ${eventId}::uuid,
        ${data.scope}::"AuditScope",
        ${data.category}::"AuditCategory",
        ${data.source}::"AuditSource",
        ${data.outcome}::"AuditOutcome",
        ${data.severity}::"AuditSeverity",
        ${data.action},
        ${data.entityType},
        ${data.entityId},
        ${data.description},
        ${data.reason},
        ${data.workspaceId}::uuid,
        ${data.customerId}::uuid,
        ${data.actorType}::"AuditActorType",
        ${data.actorIdentityId}::uuid,
        ${data.actorCustomerId}::uuid,
        ${data.actorApiKeyId}::uuid,
        ${data.sessionId}::uuid,
        ${data.actorEmail},
        ${data.actorName},
        ${data.actorPlatformRole},
        ${data.actorWorkspaceRole},
        ${data.requestId},
        ${data.ipAddress},
        ${data.userAgent},
        ${data.requestPath},
        ${data.requestMethod},
        ${oldValueJson}::jsonb,
        ${newValueJson}::jsonb,
        ${metadataJson}::jsonb
      )
      RETURNING
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
    `);

    const event = rows[0];

    if (!event) {
      throwError(ERR.DB_ERROR, 'Failed to create audit event');
    }

    return event;
  } catch (error) {
    console.error('AUDIT EVENT WRITE FAILED', error);
    throwError(ERR.DB_ERROR, 'Failed to create audit event');
  }
}
