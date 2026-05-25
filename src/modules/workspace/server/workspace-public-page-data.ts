import { withActionTxContext } from '@/lib/request/withActionContext';
import { readActorContext } from '@/lib/request/read-actor-context';
import { resolvePublicHostValue } from '@/lib/http/public-url';
import {
  getRootDomainHost,
  normalizeHostname,
  resolveFreeWorkspacePathFromValues,
} from '@/lib/middleware/proxy-utils';
import { buildWorkspacePublicHomeContract, resolveWorkspacePublicTemplateKey } from '@/modules/workspace-public/content';
import { buildWorkspaceThemeStyle, normalizeWorkspaceTheme } from '@/modules/workspace/theme';
import {
  buildWorkspaceCanonicalPath,
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import { resolveWorkspaceByDomain } from '@/modules/workspace/services/domains.services';
import {
  getWorkspaceCanonicalRoutingSnapshot,
  resolveWorkspaceCanonicalRequestRedirect,
} from '@/modules/workspace/services/workspace-canonical.services';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import {
  findWorkspaceBySlug,
  getWorkspaceAdminSurfaceWorkspace,
} from '@/modules/workspace/services/workspace.services';
import { headers } from 'next/headers';

type WorkspaceRequestContext = {
  workspace?: {
    workspaceId: string;
    slug?: string;
    strategy?: string;
    primaryDomain?: string;
  };
  path?: string;
  originalPath?: string;
  search?: string;
};

type WorkspacePublicSettingsShape = {
  branding?: {
    displayName?: string | null;
    logoUrl?: string | null;
    supportEmail?: string | null;
  };
  website?: {
    templateKey?: string | null;
  };
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

async function resolveWorkspacePublicFallback(params: {
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
    const routing = await withActionTxContext(() =>
      getWorkspaceCanonicalRoutingSnapshot(resolvedDomain.workspaceId),
    );

    return {
      workspaceId: routing.workspaceId,
      slug: routing.slug,
      strategy: routing.strategy,
      primaryDomain: routing.primaryHost,
    };
  }

  const rootHost = getRootDomainHost();
  const freeWorkspacePath = params.originalPath
    ? resolveFreeWorkspacePathFromValues({
        host: publicHost,
        rootHost,
        pathname: params.originalPath,
      })
    : null;

  if (!freeWorkspacePath?.slug) {
    return null;
  }

  const workspace = await withActionTxContext(() =>
    findWorkspaceBySlug(freeWorkspacePath.slug),
  );

  if (!workspace?.id || !workspace.isActive) {
    return null;
  }

  const routing = await withActionTxContext(() =>
    getWorkspaceCanonicalRoutingSnapshot(workspace.id),
  );

  return {
    workspaceId: routing.workspaceId,
    slug: routing.slug,
    strategy: routing.strategy,
    primaryDomain: routing.primaryHost,
  };
}

export async function getWorkspacePublicPageData() {
  const { actor, requestContext } = await readActorContext();
  const requestMeta = readWorkspaceRequestMeta(requestContext);
  const workspaceContext =
    readWorkspaceRequestContext(requestContext) ??
    (await resolveWorkspacePublicFallback({
      originalPath: requestMeta.originalPath,
    }));

  if (!workspaceContext?.workspaceId || !workspaceContext.slug) {
    return null;
  }

  const hdrs = await headers();
  const workspaceId = workspaceContext.workspaceId;
  const currentPath = requestMeta.path;
  const canonicalRedirectUrl =
    currentPath
      ? await withActionTxContext(() =>
          resolveWorkspaceCanonicalRequestRedirect({
            workspaceId,
            currentHost: resolvePublicHostValue({
              host: hdrs.get('host'),
              forwardedHost: hdrs.get('x-forwarded-host'),
            }),
            currentPath,
            visiblePath: requestMeta.originalPath,
            search: requestMeta.search,
          }),
        )
      : null;

  const workspace = await withActionTxContext(() =>
    Promise.all([
      getWorkspaceAdminSurfaceWorkspace(workspaceId),
      getWorkspaceSettings(workspaceId),
    ]),
  );
  const [workspaceRecord, workspaceSettings] = workspace;
  const strategy = normalizeWorkspaceDomainStrategy(workspaceContext.strategy);
  const homePath = buildWorkspaceCanonicalPath({
    strategy,
    slug: workspaceContext.slug,
    path: '/',
  });
  const loginPath = buildWorkspaceLoginPath({
    workspaceId: workspaceRecord.id,
    intent: strategy === 'free_path' ? 'free' : 'paid',
    strategy,
    slug: workspaceContext.slug,
  });
  const signupPath = buildWorkspaceSignupPath({
    workspaceId: workspaceRecord.id,
    intent: strategy === 'free_path' ? 'free' : 'paid',
    strategy,
    slug: workspaceContext.slug,
  });

  let continuePath: string | null = null;
  let continueLabel: string | null = null;

  if (actor.workspaceId === workspaceRecord.id && actor.customerId) {
    continuePath = buildWorkspaceCanonicalPath({
      strategy,
      slug: workspaceContext.slug,
      path: '/customer',
    });
    continueLabel = 'Open customer portal';
  } else if (actor.workspaceId === workspaceRecord.id && actor.membershipId) {
    continuePath = buildWorkspaceCanonicalPath({
      strategy,
      slug: workspaceContext.slug,
      path: '/app',
    });
    continueLabel = 'Open workspace dashboard';
  }

  const settings =
    (workspaceSettings?.settings as WorkspacePublicSettingsShape | null) ?? null;
  const theme = normalizeWorkspaceTheme(workspaceSettings?.themes);
  const templateKey = resolveWorkspacePublicTemplateKey(settings);
  const domainLabel =
    strategy === 'free_path'
      ? homePath
      : workspaceRecord.defaultDomain ?? homePath;
  const page = buildWorkspacePublicHomeContract({
    workspaceName: workspaceRecord.name,
    workspaceSlug: workspaceRecord.slug,
    settings,
    loginPath,
    signupPath,
    continuePath,
    continueLabel,
  });

  return {
    templateKey,
    workspace: workspaceRecord,
    canonicalRedirectUrl,
    strategy,
    theme,
    themeStyle: buildWorkspaceThemeStyle(workspaceSettings?.themes),
    homePath,
    loginPath,
    signupPath,
    continuePath,
    continueLabel,
    domainLabel,
    page,
  };
}
