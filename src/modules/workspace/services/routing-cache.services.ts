import { redis } from '@/lib/redis';

type WorkspaceRoutingCachePayload = {
  workspaceId: string;
  slug: string;
  isActive: boolean;
  primaryDomain?: string;
};

export function buildWorkspaceRoutingCachePayload(params: {
  workspaceId: string;
  slug: string;
  isActive?: boolean;
  primaryDomain?: string | null;
}): WorkspaceRoutingCachePayload {
  return {
    workspaceId: params.workspaceId,
    slug: params.slug,
    isActive: params.isActive ?? true,
    primaryDomain: params.primaryDomain ?? undefined,
  };
}

export async function cacheWorkspaceSlug(
  slug: string,
  payload: WorkspaceRoutingCachePayload,
) {
  if (!slug) {
    return;
  }

  await redis.set(`slug:${slug}`, payload);
}

export async function cacheWorkspaceDomain(
  domain: string,
  payload: WorkspaceRoutingCachePayload,
) {
  if (!domain) {
    return;
  }

  await redis.set(`domain:${domain.toLowerCase()}`, payload);
}

export async function clearWorkspaceSlugCache(slug: string) {
  if (!slug) {
    return;
  }

  await redis.del(`slug:${slug}`);
}

export async function clearWorkspaceDomainCache(domain: string) {
  if (!domain) {
    return;
  }

  await redis.del(`domain:${domain.toLowerCase()}`);
}
