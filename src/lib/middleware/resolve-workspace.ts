import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import {
  extractApiKey,
  getHostname,
  getRootDomainHost,
  normalizeHostname,
  resolveFreeWorkspacePath,
} from './proxy-utils';

export async function resolveWorkspace(req: NextRequest) {
  const host = normalizeHostname(getHostname(req));
  const parts = host.split('.');

  const rootDomain = getRootDomainHost();
  const rootParts = rootDomain.split('.');

  const apiKey = extractApiKey(req);
  if (apiKey) {
    const data = await redis.get(`apiKey:${apiKey}`);
    if (data) return data as any;
  }

  const domainData = await redis.get(`domain:${host}`);
  if (domainData) return domainData as any;

  const freeWorkspacePath = resolveFreeWorkspacePath(req);
  if (freeWorkspacePath) {
    const slugData = await redis.get(`slug:${freeWorkspacePath.slug}`);
    if (slugData) return slugData as any;
  }

  if (parts.length === rootParts.length + 1) {
    const domainTail = parts.slice(1).join('.');

    if (domainTail === rootDomain) {
      const slug = parts[0];
      return (await redis.get(`slug:${slug}`)) as any;
    }

    if (parts[0] === rootParts[0]) {
      const slug = parts[1];
      return (await redis.get(`slug:${slug}`)) as any;
    }
  }

  return null;
}
