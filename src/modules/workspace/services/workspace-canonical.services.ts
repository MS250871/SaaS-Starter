import { resolvePublicProtocol, withPreservedPort } from '@/lib/http/public-url';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import {
  buildWorkspaceCanonicalPath,
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
} from '@/modules/workspace/routing';
import {
  getWorkspaceRoutingSnapshot,
  type WorkspaceRoutingSnapshot,
} from '@/modules/workspace/services/workspace-routing.services';

export type WorkspaceCanonicalRoutingSnapshot = WorkspaceRoutingSnapshot;

export async function getWorkspaceCanonicalRoutingSnapshot(
  workspaceId: string,
): Promise<WorkspaceCanonicalRoutingSnapshot> {
  return getWorkspaceRoutingSnapshot(workspaceId);
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
  return routing.primaryHost;
}

export async function resolveWorkspaceLoginRedirect(params: {
  workspaceId: string;
  returnPath?: string | null;
}) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(params.workspaceId);

  return buildWorkspaceLoginPath({
    workspaceId: params.workspaceId,
    intent: routing.intent,
    returnPath: params.returnPath,
    strategy: routing.strategy,
    slug: routing.slug,
  });
}

export async function resolveWorkspaceSignupRedirect(params: {
  workspaceId: string;
  returnPath?: string | null;
}) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(params.workspaceId);

  return buildWorkspaceSignupPath({
    workspaceId: params.workspaceId,
    intent: routing.intent,
    returnPath: params.returnPath,
    strategy: routing.strategy,
    slug: routing.slug,
  });
}

export async function resolveWorkspaceCanonicalRequestRedirect(params: {
  workspaceId: string;
  currentHost: string;
  currentPath: string;
  visiblePath?: string | null;
  search?: string | null;
  currentProtocol?: string | null;
}) {
  const routing = await getWorkspaceCanonicalRoutingSnapshot(params.workspaceId);
  const canonicalPath = buildWorkspaceCanonicalPath({
    strategy: routing.strategy,
    slug: routing.slug,
    path: params.currentPath,
  });
  const normalizedCurrentHost = normalizeHostname(params.currentHost);
  const canonicalHost = normalizeHostname(routing.primaryHost);
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

  const protocol = resolvePublicProtocol({
    host: params.currentHost,
    forwardedProto: params.currentProtocol,
  });
  const canonicalHostWithPort = withPreservedPort(
    canonicalHost,
    params.currentHost,
  );

  return `${protocol}://${canonicalHostWithPort}${canonicalPathWithSearch}`;
}
