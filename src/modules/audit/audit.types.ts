import type { Prisma } from '@/generated/prisma/client';

export const auditScopes = [
  'PLATFORM',
  'WORKSPACE',
  'CUSTOMER',
  'SYSTEM',
] as const;

export type AuditScope = (typeof auditScopes)[number];

export const auditActorTypes = [
  'IDENTITY',
  'CUSTOMER',
  'API_KEY',
  'SYSTEM',
] as const;

export type AuditActorType = (typeof auditActorTypes)[number];

export const auditOutcomes = ['SUCCESS', 'FAILURE', 'DENIED'] as const;

export type AuditOutcome = (typeof auditOutcomes)[number];

export const auditCategories = [
  'AUTH',
  'GOVERNANCE',
  'CATALOG',
  'BILLING',
  'WORKSPACE',
  'CUSTOMER',
  'SUPPORT',
  'NOTIFICATION',
  'ROUTING',
  'MEDIA',
  'INTEGRATION',
  'ENTITLEMENT',
  'SECURITY',
  'SYSTEM',
] as const;

export type AuditCategory = (typeof auditCategories)[number];

export const auditSources = [
  'ADMIN_PANEL',
  'WORKSPACE_APP',
  'CUSTOMER_APP',
  'AUTH',
  'API',
  'WEBHOOK',
  'JOB',
  'SYSTEM',
] as const;

export type AuditSource = (typeof auditSources)[number];

export const auditSeverities = ['INFO', 'WARNING', 'ERROR'] as const;

export type AuditSeverity = (typeof auditSeverities)[number];

export type AuditEventInput = {
  scope?: AuditScope;
  category: AuditCategory;
  source?: AuditSource;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  reason?: string | null;
  workspaceId?: string | null;
  customerId?: string | null;
  actorType?: AuditActorType;
  actorIdentityId?: string | null;
  actorCustomerId?: string | null;
  actorApiKeyId?: string | null;
  sessionId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorPlatformRole?: string | null;
  actorWorkspaceRole?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type NormalizedAuditEventInput = {
  scope: AuditScope;
  category: AuditCategory;
  source: AuditSource;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  reason: string | null;
  workspaceId: string | null;
  customerId: string | null;
  actorType: AuditActorType;
  actorIdentityId: string | null;
  actorCustomerId: string | null;
  actorApiKeyId: string | null;
  sessionId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorPlatformRole: string | null;
  actorWorkspaceRole: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  oldValue: Prisma.InputJsonValue | null;
  newValue: Prisma.InputJsonValue | null;
  metadata: Prisma.InputJsonValue | null;
};

export type AuditEventRecord = {
  id: string;
  scope: AuditScope;
  category: AuditCategory;
  source: AuditSource;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  reason: string | null;
  workspaceId: string | null;
  customerId: string | null;
  actorType: AuditActorType;
  actorIdentityId: string | null;
  actorCustomerId: string | null;
  actorApiKeyId: string | null;
  sessionId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorPlatformRole: string | null;
  actorWorkspaceRole: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};
