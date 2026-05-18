import { LoginForm } from '@/modules/auth/components/login-form';
import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { WorkspaceAuthShell } from '@/modules/auth/components/workspace-auth-shell';
import type { AuthCookies } from '@/lib/auth/auth.schema';
import { getWorkspaceAuthPageData } from '@/modules/workspace/server/workspace-auth-page-data';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const workspaceAuth = await getWorkspaceAuthPageData();
  const intent =
    (resolvedSearchParams.intent as AuthCookies['intent']) || 'free';
  const entry = workspaceAuth?.workspaceId
    ? 'workspace'
    : (resolvedSearchParams.entry as AuthCookies['entry']) || undefined;
  const workspaceId =
    workspaceAuth?.workspaceId ??
    (typeof resolvedSearchParams.workspaceId === 'string'
      ? resolvedSearchParams.workspaceId
      : undefined);
  const returnPath =
    typeof resolvedSearchParams.returnTo === 'string'
      ? resolvedSearchParams.returnTo
      : undefined;
  const message =
    resolvedSearchParams.expired === 'verification'
      ? 'Your verification session expired. Please continue again to receive a fresh code.'
      : resolvedSearchParams.reason === 'workspace-moved'
        ? "Your workspace is ready on its updated domain. Sign in once more and we'll take you right there."
        : undefined;

  const form = (
    <LoginForm
      intent={intent}
      entry={entry}
      workspaceId={workspaceId}
      workspaceSlug={workspaceAuth?.workspaceSlug}
      workspaceStrategy={workspaceAuth?.strategy}
      returnPath={returnPath}
      message={message}
      workspaceSurface={Boolean(workspaceAuth)}
      hideTopBrand={Boolean(workspaceAuth)}
    />
  );

  if (workspaceAuth) {
    return (
      <WorkspaceAuthShell workspace={workspaceAuth} mode="login">
        {form}
      </WorkspaceAuthShell>
    );
  }

  return (
    <PlatformAuthShell mode="login">
      <LoginForm
        intent={intent}
        entry={entry}
        workspaceId={workspaceId}
        returnPath={returnPath}
        message={message}
        hideTopBrand
      />
    </PlatformAuthShell>
  );
}
