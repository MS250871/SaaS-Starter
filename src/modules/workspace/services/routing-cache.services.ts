import { cacheKeys, cacheTtls } from '@/lib/cache/cache-keys';
import { deleteRedisCache, setRedisCache } from '@/lib/cache/redis-cache';

type WorkspaceRoutingCachePayload = {
  workspaceId: string;
  slug: string;
  isActive: boolean;
  primaryDomain?: string;
  strategy?: string;
  intent?: 'free' | 'paid';
};

export function buildWorkspaceRoutingCachePayload(params: {
  workspaceId: string;
  slug: string;
  isActive?: boolean;
  primaryDomain?: string | null;
  strategy?: string | null;
  intent?: 'free' | 'paid' | null;
}): WorkspaceRoutingCachePayload {
  return {
    workspaceId: params.workspaceId,
    slug: params.slug,
    isActive: params.isActive ?? true,
    primaryDomain: params.primaryDomain ?? undefined,
    strategy: params.strategy ?? undefined,
    intent: params.intent ?? undefined,
  };
}

export async function cacheWorkspaceSlug(
  slug: string,
  payload: WorkspaceRoutingCachePayload,
) {
  if (!slug) {
    return;
  }

  await setRedisCache(cacheKeys.routingSlug(slug), payload, {
    ttlSeconds: cacheTtls.routing,
  });
}

export async function cacheWorkspaceDomain(
  domain: string,
  payload: WorkspaceRoutingCachePayload,
) {
  if (!domain) {
    return;
  }

  await setRedisCache(cacheKeys.routingDomain(domain), payload, {
    ttlSeconds: cacheTtls.routing,
  });
}

export async function clearWorkspaceSlugCache(slug: string) {
  if (!slug) {
    return;
  }

  await deleteRedisCache(cacheKeys.routingSlug(slug));
}

export async function clearWorkspaceDomainCache(domain: string) {
  if (!domain) {
    return;
  }

  await deleteRedisCache(cacheKeys.routingDomain(domain));
}
