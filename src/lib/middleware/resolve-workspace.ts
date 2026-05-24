import { NextRequest } from 'next/server';
import { cacheKeys } from '@/lib/cache/cache-keys';
import { getRedisCache } from '@/lib/cache/redis-cache';
import {
  getHostname,
  getRootDomainHost,
  isReservedWorkspaceSlug,
  normalizeHostname,
  type WorkspaceRoutingContext,
  resolveFreeWorkspacePath,
} from './proxy-utils';

export async function resolveWorkspace(
  req: NextRequest,
): Promise<WorkspaceRoutingContext | null> {
  const host = normalizeHostname(getHostname(req));
  const parts = host.split('.');

  const rootDomain = getRootDomainHost();
  const rootParts = rootDomain.split('.');

  const parseWorkspaceRoutingContext = (
    value: unknown,
  ): WorkspaceRoutingContext | null => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const workspaceId =
      typeof raw.workspaceId === 'string' && raw.workspaceId.trim()
        ? raw.workspaceId
        : null;

    if (!workspaceId) {
      return null;
    }

    return {
      workspaceId,
      slug:
        typeof raw.slug === 'string' && raw.slug.trim()
          ? raw.slug.toLowerCase()
          : undefined,
      isActive: typeof raw.isActive === 'boolean' ? raw.isActive : undefined,
      primaryDomain:
        typeof raw.primaryDomain === 'string' && raw.primaryDomain.trim()
          ? raw.primaryDomain.toLowerCase()
          : undefined,
      strategy:
        typeof raw.strategy === 'string' && raw.strategy.trim()
          ? raw.strategy
          : undefined,
    };
  };

  const hydrateManagedSubdomainContext = (
    value: WorkspaceRoutingContext | null,
    slug: string,
  ): WorkspaceRoutingContext | null => {
    if (!value) {
      return null;
    }

    return {
      ...value,
      slug: value.slug ?? slug,
      strategy: value.strategy ?? 'subdomain',
    };
  };

  const domainData = parseWorkspaceRoutingContext(
    await getRedisCache<WorkspaceRoutingContext>(
      cacheKeys.routingDomain(host),
    ),
  );
  if (domainData) return domainData;

  if (parts.length === rootParts.length + 1) {
    const domainTail = parts.slice(1).join('.');

    if (domainTail === rootDomain) {
      const slug = parts[0];
      if (isReservedWorkspaceSlug(slug)) {
        return null;
      }
      const slugData = parseWorkspaceRoutingContext(
        await getRedisCache<WorkspaceRoutingContext>(cacheKeys.routingSlug(slug)),
      );
      return hydrateManagedSubdomainContext(slugData, slug);
    }

    if (parts[0] === rootParts[0]) {
      const slug = parts[1];
      if (isReservedWorkspaceSlug(slug)) {
        return null;
      }
      const slugData = parseWorkspaceRoutingContext(
        await getRedisCache<WorkspaceRoutingContext>(cacheKeys.routingSlug(slug)),
      );
      return hydrateManagedSubdomainContext(slugData, slug);
    }
  }

  const freeWorkspacePath = resolveFreeWorkspacePath(req);
  if (freeWorkspacePath) {
    const slugData = parseWorkspaceRoutingContext(
      await getRedisCache<WorkspaceRoutingContext>(
        cacheKeys.routingSlug(freeWorkspacePath.slug),
      ),
    );
    if (slugData) return slugData;
  }

  return null;
}
