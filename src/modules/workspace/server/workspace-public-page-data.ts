import { withActionTxContext } from '@/lib/request/withActionContext';
import { readActorContext } from '@/lib/request/read-actor-context';
import { buildWorkspacePublicHomeContract, resolveWorkspacePublicTemplateKey } from '@/modules/workspace-public/content';
import { buildWorkspaceThemeStyle, normalizeWorkspaceTheme } from '@/modules/workspace/theme';
import {
  buildWorkspaceCanonicalPath,
  buildWorkspaceLoginPath,
  buildWorkspaceSignupPath,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { getWorkspaceAdminSurfaceWorkspace } from '@/modules/workspace/services/workspace.services';

type WorkspaceRequestContext = {
  workspace?: {
    workspaceId: string;
    slug?: string;
    strategy?: string;
    primaryDomain?: string;
  };
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

export async function getWorkspacePublicPageData() {
  const { actor, requestContext } = await readActorContext();
  const workspaceContext = readWorkspaceRequestContext(requestContext);

  if (!workspaceContext?.workspaceId || !workspaceContext.slug) {
    return null;
  }

  const workspace = await withActionTxContext(() =>
    Promise.all([
      getWorkspaceAdminSurfaceWorkspace(workspaceContext.workspaceId),
      getWorkspaceSettings(workspaceContext.workspaceId),
    ]),
  );
  const [workspaceRecord, workspaceSettings] = workspace;
  const strategy = normalizeWorkspaceDomainStrategy(workspaceContext.strategy);
  const intent = strategy === 'free_path' ? 'free' : 'paid';
  const homePath = buildWorkspaceCanonicalPath({
    strategy,
    slug: workspaceContext.slug,
    path: '/',
  });
  const loginPath = buildWorkspaceLoginPath({
    workspaceId: workspaceRecord.id,
    intent,
    strategy,
    slug: workspaceContext.slug,
  });
  const signupPath = buildWorkspaceSignupPath({
    workspaceId: workspaceRecord.id,
    intent,
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
