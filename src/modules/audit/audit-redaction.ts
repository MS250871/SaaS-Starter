import type { Prisma } from '@/generated/prisma/client';

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_STRING_LENGTH = 2_000;
const REDACTED_VALUE = '[REDACTED]';

const sensitiveKeyPattern =
  /(^|_)(password|secret|token|otp|signature|authorization|cookie|access_token|refresh_token|api_key|key_hash|webhook_secret)(_|$)/i;

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeUnknown(
  value: unknown,
  depth: number,
): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (depth > MAX_DEPTH) {
    return '[Max depth reached]';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return typeof value === 'string' ? truncateString(value) : value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeUnknown(item, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );

    const sanitizedObject: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entryValue] of entries) {
      if (sensitiveKeyPattern.test(key)) {
        sanitizedObject[key] = REDACTED_VALUE;
        continue;
      }

      sanitizedObject[key] = sanitizeUnknown(entryValue, depth + 1);
    }

    return sanitizedObject;
  }

  return truncateString(String(value));
}

export function sanitizeAuditPayload(
  value: Prisma.InputJsonValue | null | undefined,
) {
  return sanitizeUnknown(value, 0);
}
