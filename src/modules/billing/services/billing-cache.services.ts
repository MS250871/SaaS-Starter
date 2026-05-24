import { cacheKeys } from '@/lib/cache/cache-keys';
import { deleteRedisCache } from '@/lib/cache/redis-cache';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';

export async function invalidateWorkspaceActiveSubscriptionSummaryCache(
  workspaceId: string,
) {
  if (!workspaceId) {
    return;
  }

  await deleteRedisCache(cacheKeys.workspaceActiveSubscriptionSummary(workspaceId));
}

export async function invalidateWorkspaceBillingCaches(workspaceId: string) {
  if (!workspaceId) {
    return;
  }

  await Promise.all([
    invalidateWorkspaceActiveSubscriptionSummaryCache(workspaceId),
    invalidateWorkspaceSurfaceCaches(workspaceId),
  ]);
}
