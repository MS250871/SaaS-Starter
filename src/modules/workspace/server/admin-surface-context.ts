import { cache } from 'react';
import { headers } from 'next/headers';

import { readActorContext } from '@/lib/request/read-actor-context';
import {
  getRootDomainHost,
  isRootWorkspaceHost,
  normalizeHostname,
} from '@/lib/middleware/proxy-utils';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { getWorkspaceAdminSurfaceWorkspace } from '@/modules/workspace/services/workspace.services';

function getWorkspaceBasePath(params: {
  slug?: string | null;
  strategy?: string | null;
  host?: string | null;
}) {
  const normalizedHost = normalizeHostname(params.host ?? '');
  const rootHost = getRootDomainHost();

  if (
    params.slug &&
    params.strategy === 'free_path' &&
    isRootWorkspaceHost(normalizedHost, rootHost)
  ) {
    return `/${params.slug}/app`;
  }

  return '/app';
}

const getWorkspaceAdminSurfaceContextCached = cache(async () => {
  const { actor, requestContext } = await readActorContext();
  const hdrs = await headers();
  const workspaceId = actor.workspaceId;

  if (!workspaceId) {
    return {
      actor,
      requestContext,
      workspaceId: undefined,
      workspace: null,
      settings: null,
      basePath: '/app',
    };
  }

  const [workspace, settings] = await Promise.all([
    getWorkspaceAdminSurfaceWorkspace(workspaceId),
    getWorkspaceSettings(workspaceId),
  ]);

  if (!workspace) {
    return {
      actor,
      requestContext,
      workspaceId: undefined,
      workspace: null,
      settings: null,
      basePath: '/app',
    };
  }

  const strategy =
    (
      settings?.settings as {
        domain?: { strategy?: string | null };
      } | null
    )?.domain?.strategy ?? null;

  return {
    actor,
    requestContext,
    workspaceId,
    workspace,
    settings,
    slug: workspace.slug,
    strategy,
    basePath: getWorkspaceBasePath({
      slug: workspace.slug,
      strategy,
      host: hdrs.get('host'),
    }),
  };
});

export async function getWorkspaceAdminSurfaceContext() {
  return getWorkspaceAdminSurfaceContextCached();
}

export type WorkspaceAdminSurfaceContext = Awaited<
  ReturnType<typeof getWorkspaceAdminSurfaceContext>
>;
