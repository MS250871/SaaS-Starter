import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getRootDomainHost, normalizeHostname } from '@/lib/middleware/proxy-utils';
import { withPreservedPort } from '@/lib/http/public-url';
import {
  buildManagedWorkspaceSubdomain,
  buildWorkspaceCanonicalPath,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';

type WorkspaceSettingsShape = {
  domain?: {
    strategy?: string | null;
    rootDomain?: string | null;
    primaryHost?: string | null;
  };
};

export type WorkspaceCanonicalRoutingSnapshot = {
  workspaceId: string;
  slug: string;
  strategy: ReturnType<typeof normalizeWorkspaceDomainStrategy>;
  canonicalHost: string;
  rootHost: string;
};

export async function getWorkspaceCanonicalRoutingSnapshot(
  workspaceId: string,
): Promise<WorkspaceCanonicalRoutingSnapshot> {
  return withUnitOfWork(async () => {
    const [workspace, settings] = await Promise.all([
      getWorkspaceById(workspaceId),
      getWorkspaceSettings(workspaceId),
    ]);
    const settingsJson =
      settings?.settings && typeof settings.settings === 'object'
        ? (settings.settings as WorkspaceSettingsShape)
        : null;
    const strategy = normalizeWorkspaceDomainStrategy(
      settingsJson?.domain?.strategy,
    );
    const configuredRootHost =
      typeof settingsJson?.domain?.rootDomain === 'string' &&
      settingsJson.domain.rootDomain.trim()
        ? normalizeHostname(settingsJson.domain.rootDomain)
        : getRootDomainHost();
    const defaultDomain =
      typeof workspace.defaultDomain === 'string' && workspace.defaultDomain.trim()
        ? normalizeHostname(workspace.defaultDomain)
        : '';
    const primaryHost =
      typeof settingsJson?.domain?.primaryHost === 'string' &&
      settingsJson.domain.primaryHost.trim()
        ? normalizeHostname(settingsJson.domain.primaryHost)
        : '';

    const canonicalHost =
      defaultDomain ||
      primaryHost ||
      (strategy === 'subdomain'
        ? buildManagedWorkspaceSubdomain(workspace.slug, configuredRootHost)
        : configuredRootHost);

    return {
      workspaceId: workspace.id,
      slug: workspace.slug,
      strategy,
      canonicalHost,
      rootHost: configuredRootHost,
    };
  });
}

export async function resolveWorkspaceSurfaceRedirect(params: {
  workspaceId: string;
  fallbackPath: '/app' | '/customer';
}) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(params.workspaceId);

  return buildWorkspaceCanonicalPath({
    strategy: routing.strategy,
    slug: routing.slug,
    path: params.fallbackPath,
  });
}

export async function resolveWorkspaceCanonicalSurfaceHost(workspaceId: string) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(workspaceId);
  return routing.canonicalHost;
}

export async function resolveWorkspaceCanonicalRequestRedirect(params: {
  workspaceId: string;
  currentHost: string;
  currentPath: string;
  visiblePath?: string | null;
  search?: string | null;
}) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(params.workspaceId);
  const canonicalPath = buildWorkspaceCanonicalPath({
    strategy: routing.strategy,
    slug: routing.slug,
    path: params.currentPath,
  });
  const normalizedCurrentHost = normalizeHostname(params.currentHost);
  const canonicalHost = normalizeHostname(routing.canonicalHost);
  const search = params.search ?? '';
  const comparisonPath = params.visiblePath || params.currentPath;
  const currentPathWithSearch = `${comparisonPath}${search}`;
  const canonicalPathWithSearch = `${canonicalPath}${search}`;

  if (
    normalizedCurrentHost === canonicalHost &&
    currentPathWithSearch === canonicalPathWithSearch
  ) {
    return null;
  }

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const canonicalHostWithPort = withPreservedPort(
    canonicalHost,
    params.currentHost,
  );

  return `${protocol}://${canonicalHostWithPort}${canonicalPathWithSearch}`;
}
