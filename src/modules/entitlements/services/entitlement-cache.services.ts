import { cacheKeys, cacheTtls, cacheVersionKeys } from '@/lib/cache/cache-keys';
import {
  bumpRedisCacheVersion,
  getRedisCacheVersion,
  rememberRedisCache,
} from '@/lib/cache/redis-cache';
import { getCatalogCacheVersion } from '@/modules/entitlements/services/catalog-cache.services';

export async function getWorkspaceEntitlementsCacheVersion(workspaceId: string) {
  return getRedisCacheVersion(cacheVersionKeys.workspaceEntitlements(workspaceId));
}

export async function invalidateWorkspaceEntitlementsCache(workspaceId: string) {
  await bumpRedisCacheVersion(cacheVersionKeys.workspaceEntitlements(workspaceId));
}

export async function readResolvedWorkspaceEntitlementsCache<T>(
  params: {
    workspaceId: string;
    planId?: string | null;
  },
  loader: () => Promise<T>,
) {
  const [catalogVersion, workspaceEntitlementsVersion] = await Promise.all([
    getCatalogCacheVersion(),
    getWorkspaceEntitlementsCacheVersion(params.workspaceId),
  ]);

  return rememberRedisCache(
    cacheKeys.resolvedEntitlements(
      catalogVersion,
      workspaceEntitlementsVersion,
      params.workspaceId,
      params.planId,
    ),
    loader,
    {
      ttlSeconds: cacheTtls.entitlements,
    },
  );
}
