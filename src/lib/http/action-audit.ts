import { createAuditEvent } from '@/modules/audit/services/audit-event.services';
import type { AuditEventInput } from '@/modules/audit/audit.types';

export type MaybePromise<T> = T | Promise<T>;

export type AuditInputFactoryResult =
  | AuditEventInput
  | AuditEventInput[]
  | null
  | undefined;

export async function writeAuditInputs(inputs: AuditInputFactoryResult) {
  if (!inputs) {
    return;
  }

  const list = Array.isArray(inputs) ? inputs : [inputs];

  for (const input of list) {
    await createAuditEvent(input);
  }
}

export async function tryWriteAuditInputs(
  inputs: AuditInputFactoryResult,
  label: string,
) {
  if (!inputs) {
    return;
  }

  try {
    await writeAuditInputs(inputs);
  } catch (error) {
    console.error(`AUDIT WRITE FAILED (${label})`, error);
  }
}
