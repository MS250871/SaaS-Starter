import { NextRequest } from 'next/server';
import { reservedWorkspaceSlugs } from '@/modules/workspace/constants';

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
  const host = normalizeHostname(getHostname(req));

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
  const rewrittenPathname = remaining ? `/${remaining}` : '/app';

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
