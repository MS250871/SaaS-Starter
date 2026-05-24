import { cacheTtls, cacheVersionKeys } from '@/lib/cache/cache-keys';
import {
  bumpRedisCacheVersion,
  getRedisCacheVersion,
  rememberRedisCache,
} from '@/lib/cache/redis-cache';

export async function getPermissionsCacheVersion() {
  return getRedisCacheVersion(cacheVersionKeys.permissions());
}

export async function invalidatePermissionsCache() {
  await bumpRedisCacheVersion(cacheVersionKeys.permissions());
}

export async function readPermissionsCache<T>(
  buildKey: (permissionsVersion: number) => string,
  loader: () => Promise<T>,
  options?: { cacheNull?: boolean },
) {
  const permissionsVersion = await getPermissionsCacheVersion();

  return rememberRedisCache(buildKey(permissionsVersion), loader, {
    ttlSeconds: cacheTtls.permissions,
    cacheNull: options?.cacheNull,
  });
}
