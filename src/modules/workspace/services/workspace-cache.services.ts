import { cacheKeys, cacheTtls } from '@/lib/cache/cache-keys';
import { deleteRedisCache, rememberRedisCache } from '@/lib/cache/redis-cache';

export function readWorkspaceSettingsCache<T>(
  workspaceId: string,
  loader: () => Promise<T>,
) {
  return rememberRedisCache(cacheKeys.workspaceSettings(workspaceId), loader, {
    ttlSeconds: cacheTtls.workspaceSettings,
  });
}

export function readWorkspaceAdminSurfaceWorkspaceCache<T>(
  workspaceId: string,
  loader: () => Promise<T>,
) {
  return rememberRedisCache(
    cacheKeys.workspaceAdminSurfaceWorkspace(workspaceId),
    loader,
    {
      ttlSeconds: cacheTtls.workspaceAdminSurfaceWorkspace,
    },
  );
}

export async function invalidateWorkspaceSettingsCache(workspaceId: string) {
  await deleteRedisCache(cacheKeys.workspaceSettings(workspaceId));
}

export async function invalidateWorkspaceAdminSurfaceWorkspaceCache(
  workspaceId: string,
) {
  await deleteRedisCache(cacheKeys.workspaceAdminSurfaceWorkspace(workspaceId));
}

export async function invalidateWorkspaceSurfaceCaches(workspaceId: string) {
  await deleteRedisCache(
    cacheKeys.workspaceSettings(workspaceId),
    cacheKeys.workspaceAdminSurfaceWorkspace(workspaceId),
  );
}
