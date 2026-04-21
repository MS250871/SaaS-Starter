import path from 'node:path';
import { randomUUID } from '@/lib/auth/auth-utils';

export type MediaOwnerContext = {
  workspaceId?: string | null;
  identityId?: string | null;
  customerId?: string | null;
};

export type BuildMediaStorageKeyParams = MediaOwnerContext & {
  fileName: string;
  prefix?: string;
  now?: Date;
};

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = sanitizeSegment(parsed.name || 'file') || 'file';
  const ext = sanitizeSegment(parsed.ext.replace(/^\./, ''));

  return ext ? `${base}.${ext}` : base;
}

export function buildMediaScopeSegments(context: MediaOwnerContext) {
  const segments = ['media'];

  if (context.workspaceId) {
    segments.push('workspace', context.workspaceId);
  }

  if (context.customerId) {
    segments.push('customer', context.customerId);
  } else if (context.identityId) {
    segments.push('identity', context.identityId);
  } else {
    segments.push('global');
  }

  return segments;
}

export function buildMediaStorageKey({
  fileName,
  prefix,
  now = new Date(),
  ...context
}: BuildMediaStorageKeyParams) {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = sanitizeFileName(fileName);
  const scope = buildMediaScopeSegments(context);

  const segments = [
    ...(prefix ? [sanitizeSegment(prefix)] : []),
    ...scope,
    yyyy,
    mm,
    `${randomUUID()}-${safeName}`,
  ].filter(Boolean);

  return segments.join('/');
}
