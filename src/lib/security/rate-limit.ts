import crypto from 'node:crypto';

import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { redis } from '@/lib/redis';

type RateLimitParams = {
  namespace: string;
  keyParts: Array<string | number | null | undefined>;
  limit: number;
  windowSeconds: number;
  message?: string;
};

function normalizeKeyPart(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function hashKeyPart(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function buildStorageKey(
  namespace: string,
  keyParts: Array<string | number | null | undefined>,
) {
  const normalizedParts = keyParts
    .map(normalizeKeyPart)
    .filter((part): part is string => Boolean(part))
    .map(hashKeyPart);

  if (normalizedParts.length === 0) {
    throwError(ERR.INTERNAL_ERROR, `Rate limit key for ${namespace} is empty.`);
  }

  return ['rate-limit', namespace, ...normalizedParts].join(':');
}

function normalizeRetryAfterSeconds(ttl: number, windowSeconds: number) {
  if (!Number.isFinite(ttl) || ttl <= 0) {
    return windowSeconds;
  }

  return Math.max(1, Math.floor(ttl));
}

export async function assertRateLimit(params: RateLimitParams) {
  if (params.limit <= 0 || params.windowSeconds <= 0) {
    return;
  }

  const storageKey = buildStorageKey(params.namespace, params.keyParts);
  const count = await redis.incr(storageKey);

  if (count === 1) {
    await redis.expire(storageKey, params.windowSeconds);
  }

  const ttl = await redis.ttl(storageKey);

  if (count > params.limit) {
    throwError(ERR.RATE_LIMITED, params.message ?? 'Too many requests', 429, {
      namespace: params.namespace,
      limit: params.limit,
      windowSeconds: params.windowSeconds,
      retryAfterSeconds: normalizeRetryAfterSeconds(ttl, params.windowSeconds),
    });
  }
}

export function getRequestRateLimitSubject(label = 'request') {
  const requestContext = getRequestContext();

  return (
    requestContext.ip?.trim().toLowerCase() ??
    requestContext.deviceId?.trim() ??
    requestContext.userAgent?.trim().toLowerCase() ??
    `${label}:${requestContext.requestId}`
  );
}

export function getRequestIpFromHeaders(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip')?.trim() ??
    null
  );
}
