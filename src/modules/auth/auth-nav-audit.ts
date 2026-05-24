import type { Prisma } from '@/generated/prisma/client';
import {
  getRequestAuditState,
  setRequestAuditState,
} from '@/lib/context/request-context';
import type { AuditEventInput } from '@/modules/audit/audit.types';

type NavActionError = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

type BuildNavErrorAuditParams = {
  action: string;
  description: string;
  error: NavActionError;
  state?: AuditEventInput | null;
  category?: AuditEventInput['category'];
  source?: AuditEventInput['source'];
  entityType?: string;
  metadata?: Prisma.InputJsonValue;
};

export function setNavAuditState(input: AuditEventInput) {
  setRequestAuditState(input);
}

export function getNavAuditState() {
  return getRequestAuditState<AuditEventInput | null>() ?? null;
}

export function buildNavErrorAudit({
  action,
  description,
  error,
  state,
  category = 'AUTH',
  source = 'AUTH',
  entityType = 'AuthFlow',
  metadata,
}: BuildNavErrorAuditParams): AuditEventInput {
  return {
    ...state,
    category: state?.category ?? category,
    source: state?.source ?? source,
    action: state?.action ?? action,
    entityType: state?.entityType ?? entityType,
    entityId: state?.entityId ?? undefined,
    description,
    metadata: state?.metadata ?? metadata,
    outcome:
      error.status === 401 || error.status === 403 ? 'DENIED' : 'FAILURE',
    reason: error.code,
  };
}
