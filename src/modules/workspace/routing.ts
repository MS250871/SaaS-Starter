import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type WorkspaceDomainStrategy =
  | 'free_path'
  | 'subdomain'
  | 'custom_domain';

export const WORKSPACE_PUBLIC_HOME_PATH = '/workspace-home';

const freePathExactWorkspaceRoutes = new Set([
  '/',
  '/login',
  '/signup',
  '/verify-otp',
  '/verify-phone',
  '/post-login',
]);

function normalizeInternalPath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

function normalizeWorkspaceSurfacePath(path: string) {
  if (path === WORKSPACE_PUBLIC_HOME_PATH) {
    return '/';
  }

  return normalizeInternalPath(path);
}

export function normalizeWorkspaceDomainStrategy(
  value: string | null | undefined,
): WorkspaceDomainStrategy {
  if (value === 'subdomain' || value === 'custom_domain') {
    return value;
  }

  return 'free_path';
}

export function buildManagedWorkspaceSubdomain(
  slug: string,
  rootDomain: string,
) {
  if (!slug || !rootDomain) {
    throwError(ERR.INVALID_INPUT, 'slug and rootDomain are required');
  }

  return `${slug}.${rootDomain}`.toLowerCase();
}

export function buildWorkspaceCanonicalPath(params: {
  strategy: WorkspaceDomainStrategy;
  slug: string;
  path: string;
}) {
  const path = normalizeWorkspaceSurfacePath(params.path);

  if (
    params.strategy === 'free_path' &&
    (freePathExactWorkspaceRoutes.has(path) ||
      path === '/app' ||
      path.startsWith('/app/') ||
      path === '/customer' ||
      path.startsWith('/customer/'))
  ) {
    return path === '/' ? `/${params.slug}` : `/${params.slug}${path}`;
  }

  return path;
}

export function buildWorkspaceSurfacePath(params: {
  strategy?: string | null;
  slug?: string | null;
  path: string;
}) {
  const path = normalizeWorkspaceSurfacePath(params.path);

  if (!params.slug) {
    return path;
  }

  return buildWorkspaceCanonicalPath({
    strategy: normalizeWorkspaceDomainStrategy(params.strategy),
    slug: params.slug,
    path,
  });
}

export function buildWorkspaceLoginPath(params: {
  workspaceId: string;
  intent?: 'free' | 'paid' | null;
  returnPath?: string | null;
  strategy?: string | null;
  slug?: string | null;
}) {
  const search = new URLSearchParams({
    entry: 'workspace',
    workspaceId: params.workspaceId,
  });

  if (params.intent) {
    search.set('intent', params.intent);
  }

  if (params.returnPath) {
    search.set('returnTo', params.returnPath);
  }

  const basePath = buildWorkspaceSurfacePath({
    strategy: params.strategy,
    slug: params.slug,
    path: '/login',
  });

  return `${basePath}?${search.toString()}`;
}

export function buildWorkspaceSignupPath(params: {
  workspaceId: string;
  intent?: 'free' | 'paid' | null;
  returnPath?: string | null;
  strategy?: string | null;
  slug?: string | null;
}) {
  const search = new URLSearchParams({
    entry: 'workspace',
    workspaceId: params.workspaceId,
  });

  if (params.intent) {
    search.set('intent', params.intent);
  }

  if (params.returnPath) {
    search.set('returnTo', params.returnPath);
  }

  const basePath = buildWorkspaceSurfacePath({
    strategy: params.strategy,
    slug: params.slug,
    path: '/signup',
  });

  return `${basePath}?${search.toString()}`;
}
