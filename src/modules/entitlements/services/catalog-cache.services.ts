import { cacheKeys, cacheTtls, cacheVersionKeys } from '@/lib/cache/cache-keys';
import {
  bumpRedisCacheVersion,
  deleteRedisCache,
  getRedisCacheVersion,
  rememberRedisCache,
} from '@/lib/cache/redis-cache';

export async function getCatalogCacheVersion() {
  return getRedisCacheVersion(cacheVersionKeys.catalog());
}

export async function invalidateCatalogCache() {
  await bumpRedisCacheVersion(cacheVersionKeys.catalog());
}

export async function readCatalogCache<T>(
  buildKey: (catalogVersion: number) => string,
  loader: () => Promise<T>,
  options?: { cacheNull?: boolean },
) {
  const catalogVersion = await getCatalogCacheVersion();

  return rememberRedisCache(buildKey(catalogVersion), loader, {
    ttlSeconds: cacheTtls.catalog,
    cacheNull: options?.cacheNull,
  });
}

export async function invalidateWorkspaceEntitlementOverrideCaches(
  workspaceId: string,
) {
  const catalogVersion = await getCatalogCacheVersion();

  await deleteRedisCache(
    cacheKeys.workspaceFeatureOverrides(catalogVersion, workspaceId),
    cacheKeys.workspaceLimitOverrides(catalogVersion, workspaceId),
  );
}
