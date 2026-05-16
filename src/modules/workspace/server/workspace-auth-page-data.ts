import { withActionTxContext } from '@/lib/request/withActionContext';
import { readActorContext } from '@/lib/request/read-actor-context';
import {
  buildWorkspaceCanonicalPath,
  normalizeWorkspaceDomainStrategy,
  type WorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import { buildWorkspaceThemeStyle } from '@/modules/workspace/theme';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { getWorkspaceAdminSurfaceWorkspace } from '@/modules/workspace/services/workspace.services';

type WorkspaceRequestContext = {
  workspace?: {
    workspaceId: string;
    slug?: string;
    strategy?: string;
  };
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
};

function readWorkspaceRequestContext(requestContext: unknown) {
  return (requestContext as WorkspaceRequestContext | null)?.workspace;
}

export async function getWorkspaceAuthPageData(): Promise<WorkspaceAuthPageData | null> {
  const { requestContext } = await readActorContext();
  const workspaceContext = readWorkspaceRequestContext(requestContext);

  if (!workspaceContext?.workspaceId || !workspaceContext.slug) {
    return null;
  }

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
  const homePath = buildWorkspaceCanonicalPath({
    strategy,
    slug: workspace.slug,
    path: '/',
  });
  const domainLabel =
    strategy === 'free_path' ? homePath : workspace.defaultDomain ?? homePath;

  return {
    workspaceId: workspace.id,
    workspaceName,
    workspaceSlug: workspace.slug,
    logoUrl: settings?.branding?.logoUrl ?? null,
    supportEmail: settings?.branding?.supportEmail ?? null,
    strategy,
    homePath,
    domainLabel,
    themeStyle: buildWorkspaceThemeStyle(workspaceSettings?.themes),
  };
}
