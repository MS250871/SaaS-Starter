import { NextRequest } from 'next/server';
import type { SessionClaims } from '@/lib/auth/auth.schema';
import { reservedWorkspaceSlugs } from '@/modules/workspace/constants';
import {
  buildWorkspaceCanonicalPath,
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
  normalizeWorkspaceDomainStrategy,
  WORKSPACE_PUBLIC_HOME_PATH,
} from '@/modules/workspace/routing';

const workspaceAuthRoutes = new Set([
  '/login',
  '/signup',
  '/verify-otp',
  '/verify-phone',
  '/post-login',
]);

export function getHostname(req: NextRequest) {
  return req.headers.get('host') || '';
}

export function normalizeHostname(host: string) {
  return host.split(':')[0]?.toLowerCase() ?? '';
}

export function getRootDomainHost() {
  return normalizeHostname(process.env.ROOT_DOMAIN || '');
}

function isLocalRootHostAlias(host: string, rootHost: string) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (!rootHost.endsWith('.localhost')) {
    return false;
  }

  return host === 'localhost' || host === '127.0.0.1';
}

export function isRootWorkspaceHost(host: string, rootHost: string) {
  if (!rootHost) {
    return false;
  }

  return host === rootHost || isLocalRootHostAlias(host, rootHost);
}

export function getSubdomains(host: string) {
  const parts = host.split('.');

  if (parts.length && parts[parts.length - 1].includes(':')) {
    parts[parts.length - 1] = parts[parts.length - 1].split(':')[0];
  }

  return parts;
}

export function extractApiKey(req: NextRequest): string | null {
  return (
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

export function resolveFreeWorkspacePath(req: NextRequest) {
  const rootHost = getRootDomainHost();
  // console.log('root host:' + rootHost);
  const host = normalizeHostname(getHostname(req));
  // console.log('request host:' + host);

  if (!isRootWorkspaceHost(host, rootHost)) {
    return null;
  }

  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  const slug = segments[0]?.toLowerCase();

  if (!slug) {
    return null;
  }

  if (
    reservedWorkspaceSlugs.includes(
      slug as (typeof reservedWorkspaceSlugs)[number],
    )
  ) {
    return null;
  }

  const remaining = segments.slice(1).join('/');
  const rewrittenPathname = remaining ? `/${remaining}` : WORKSPACE_PUBLIC_HOME_PATH;
  // console.log('re-written pathname:' + rewrittenPathname);

  return {
    slug,
    rewrittenPathname,
  };
}

export function isPublicRoute(pathname: string) {
  return pathname === '/login' || pathname === '/signup';
}

export function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith('/app') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/customer') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/select-workspace') ||
    pathname.startsWith('/create-workspace')
  );
}

type WorkspaceRoutingContext = {
  workspaceId: string;
  slug?: string;
  isActive?: boolean;
  primaryDomain?: string;
  strategy?: string;
};

function inferWorkspaceIntent(strategy: string | undefined) {
  return normalizeWorkspaceDomainStrategy(strategy) === 'free_path'
    ? ('free' as const)
    : ('paid' as const);
}

export function isWorkspaceAuthRoute(pathname: string) {
  return workspaceAuthRoutes.has(pathname);
}

export function buildWorkspaceRedirectUrl(
  req: NextRequest,
  host: string,
  path: string,
) {
  const url = new URL(path, req.url);
  url.hostname = host;
  url.port = req.nextUrl.port;

  return url;
}

export async function resolveWorkspaceCanonicalRedirect(params: {
  req: NextRequest;
  workspace: WorkspaceRoutingContext;
  normalizedPathname: string;
  session: SessionClaims | null;
}) {
  if (params.req.nextUrl.pathname === '/host-transfer' || !params.workspace.slug) {
    return null;
  }

  const host = normalizeHostname(getHostname(params.req));
  const rootHost = getRootDomainHost();
  const strategy = normalizeWorkspaceDomainStrategy(params.workspace.strategy);
  const canonicalHost =
    strategy === 'free_path'
      ? rootHost
      : params.workspace.primaryDomain ?? rootHost;
  const intent = inferWorkspaceIntent(params.workspace.strategy);
  const search = params.req.nextUrl.search;

  if (isWorkspaceAuthRoute(params.normalizedPathname)) {
    if (host === canonicalHost) {
      return null;
    }

    const returnPath = buildWorkspaceCanonicalPath({
      strategy,
      slug: params.workspace.slug,
      path: '/app',
    });
    const authPath =
      params.normalizedPathname === '/signup'
        ? buildWorkspaceSignupPath({
            workspaceId: params.workspace.workspaceId,
            intent,
            returnPath,
            strategy,
            slug: params.workspace.slug,
          })
        : buildWorkspaceLoginPath({
            workspaceId: params.workspace.workspaceId,
            intent,
            returnPath,
            strategy,
            slug: params.workspace.slug,
          });
    const authUrl = buildWorkspaceRedirectUrl(params.req, canonicalHost, authPath);
    authUrl.searchParams.set('reason', 'workspace-moved');
    return authUrl;
  }

  const canonicalPath = buildWorkspaceCanonicalPath({
    strategy,
    slug: params.workspace.slug,
    path: params.normalizedPathname,
  });
  const currentPathWithSearch = `${params.req.nextUrl.pathname}${search}`;
  const canonicalPathWithSearch = `${canonicalPath}${search}`;

  if (host === canonicalHost && currentPathWithSearch === canonicalPathWithSearch) {
    return null;
  }

  return buildWorkspaceRedirectUrl(
    params.req,
    canonicalHost,
    canonicalPathWithSearch,
  );
}
