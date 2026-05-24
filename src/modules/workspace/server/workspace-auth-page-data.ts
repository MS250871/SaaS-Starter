import { headers } from 'next/headers';
import { withActionTxContext } from '@/lib/request/withActionContext';
import { resolvePublicHostValue } from '@/lib/http/public-url';
import {
  getRootDomainHost,
  isReservedWorkspaceSlug,
  normalizeHostname,
  resolveFreeWorkspacePathFromValues,
} from '@/lib/middleware/proxy-utils';
import { readActorContext } from '@/lib/request/read-actor-context';
import {
  buildWorkspaceCanonicalPath,
  normalizeWorkspaceDomainStrategy,
  type WorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import { buildWorkspaceThemeStyle } from '@/modules/workspace/theme';
import { resolveWorkspaceByDomain } from '@/modules/workspace/services/domains.services';
import { resolveWorkspaceCanonicalRequestRedirect } from '@/modules/workspace/services/workspace-canonical.services';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import {
  findWorkspaceBySlug,
  getWorkspaceById,
  getWorkspaceAdminSurfaceWorkspace,
} from '@/modules/workspace/services/workspace.services';

type WorkspaceRequestContext = {
  workspace?: {
    workspaceId: string;
    slug?: string;
    strategy?: string;
  };
  path?: string;
  originalPath?: string;
  search?: string;
};

type WorkspaceAuthSettingsShape = {
  branding?: {
    displayName?: string | null;
    logoUrl?: string | null;
    supportEmail?: string | null;
  };
};

export type WorkspaceAuthPageData = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  logoUrl: string | null;
  supportEmail: string | null;
  strategy: WorkspaceDomainStrategy;
  homePath: string;
  domainLabel: string;
  themeStyle: ReturnType<typeof buildWorkspaceThemeStyle>;
  canonicalRedirectUrl: string | null;
};

function readWorkspaceRequestContext(requestContext: unknown) {
  return (requestContext as WorkspaceRequestContext | null)?.workspace;
}

function readWorkspaceRequestMeta(requestContext: unknown) {
  const resolved = requestContext as WorkspaceRequestContext | null;

  return {
    path: resolved?.path ?? null,
    originalPath: resolved?.originalPath ?? null,
    search: resolved?.search ?? '',
  };
}

function inferManagedSubdomainSlug(host: string, rootHost: string) {
  if (!host || !rootHost) {
    return null;
  }

  const hostParts = host.split('.');
  const rootParts = rootHost.split('.');

  if (hostParts.length !== rootParts.length + 1) {
    return null;
  }

  const domainTail = hostParts.slice(1).join('.');

  if (domainTail !== rootHost) {
    return null;
  }

  const slug = hostParts[0]?.toLowerCase();

  if (!slug || isReservedWorkspaceSlug(slug)) {
    return null;
  }

  return slug;
}

async function resolveWorkspaceAuthFallback(params: {
  originalPath?: string | null;
}) {
  const hdrs = await headers();
  const publicHost = resolvePublicHostValue({
    host: hdrs.get('host'),
    forwardedHost: hdrs.get('x-forwarded-host'),
  });
  const host = normalizeHostname(publicHost);

  if (!host) {
    return null;
  }

  const resolvedDomain = await withActionTxContext(() =>
    resolveWorkspaceByDomain(host),
  );

  if (resolvedDomain?.workspaceId) {
    const workspace = await withActionTxContext(() =>
      getWorkspaceById(resolvedDomain.workspaceId),
    );

    return {
      workspaceId: workspace.id,
      slug: workspace.slug,
      strategy:
        resolvedDomain.type === 'CUSTOM' ? 'custom_domain' : 'subdomain',
    } satisfies NonNullable<WorkspaceRequestContext['workspace']>;
  }

  const rootHost = getRootDomainHost();
  const freeWorkspacePath = params.originalPath
    ? resolveFreeWorkspacePathFromValues({
        host: publicHost,
        rootHost,
        pathname: params.originalPath,
      })
    : null;

  if (freeWorkspacePath?.slug) {
    const workspace = await withActionTxContext(() =>
      findWorkspaceBySlug(freeWorkspacePath.slug),
    );

    if (workspace?.id && workspace.isActive) {
      return {
        workspaceId: workspace.id,
        slug: workspace.slug,
        strategy:
          host === normalizeHostname(workspace.defaultDomain ?? '')
            ? 'subdomain'
            : undefined,
      } satisfies NonNullable<WorkspaceRequestContext['workspace']>;
    }
  }

  const slug = inferManagedSubdomainSlug(host, rootHost);

  if (!slug) {
    return null;
  }

  const workspace = await withActionTxContext(() => findWorkspaceBySlug(slug));

  if (!workspace?.id || !workspace.isActive) {
    return null;
  }

  return {
    workspaceId: workspace.id,
    slug: workspace.slug,
    strategy: host === normalizeHostname(workspace.defaultDomain ?? '')
      ? 'subdomain'
      : undefined,
  } satisfies NonNullable<WorkspaceRequestContext['workspace']>;
}

export async function getWorkspaceAuthPageData(): Promise<WorkspaceAuthPageData | null> {
  const { requestContext } = await readActorContext();
  const requestMeta = readWorkspaceRequestMeta(requestContext);
  const workspaceContext =
    readWorkspaceRequestContext(requestContext) ??
    (await resolveWorkspaceAuthFallback({
      originalPath: requestMeta.originalPath,
    }));

  if (!workspaceContext?.workspaceId) {
    return null;
  }

  const hdrs = await headers();
  const currentPublicHost = resolvePublicHostValue({
    host: hdrs.get('host'),
    forwardedHost: hdrs.get('x-forwarded-host'),
  });
  const canonicalRedirectUrl =
    requestMeta.path
      ? await resolveWorkspaceCanonicalRequestRedirect({
          workspaceId: workspaceContext.workspaceId,
          currentHost: currentPublicHost,
          currentPath: requestMeta.path,
          visiblePath: requestMeta.originalPath,
          search: requestMeta.search,
        })
      : null;
  const [workspace, workspaceSettings] = await withActionTxContext(() =>
    Promise.all([
      getWorkspaceAdminSurfaceWorkspace(workspaceContext.workspaceId),
      getWorkspaceSettings(workspaceContext.workspaceId),
    ]),
  );

  const strategy = normalizeWorkspaceDomainStrategy(workspaceContext.strategy);
  const settings =
    (workspaceSettings?.settings as WorkspaceAuthSettingsShape | null) ?? null;
  const workspaceName =
    settings?.branding?.displayName?.trim() || workspace.name;
  const workspaceSlug = workspaceContext.slug ?? workspace.slug;
  const homePath = buildWorkspaceCanonicalPath({
    strategy,
    slug: workspaceSlug,
    path: '/',
  });
  const domainLabel =
    strategy === 'free_path' ? homePath : workspace.defaultDomain ?? homePath;

  return {
    workspaceId: workspace.id,
    workspaceName,
    workspaceSlug,
    logoUrl: settings?.branding?.logoUrl ?? null,
    supportEmail: settings?.branding?.supportEmail ?? null,
    strategy,
    homePath,
    domainLabel,
    themeStyle: buildWorkspaceThemeStyle(workspaceSettings?.themes),
    canonicalRedirectUrl,
  };
}
