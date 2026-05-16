import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { SignupForm } from '@/modules/auth/components/signup-form';
import { WorkspaceAuthShell } from '@/modules/auth/components/workspace-auth-shell';
import type { AuthCookies } from '@/lib/auth/auth.schema';
import { getWorkspaceAuthPageData } from '@/modules/workspace/server/workspace-auth-page-data';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const workspaceAuth = await getWorkspaceAuthPageData();
  const intent =
    (resolvedSearchParams.intent as AuthCookies['intent']) || 'free';
  const invite = resolvedSearchParams.invite as string | undefined;
  const entry =
    invite && resolvedSearchParams.entry
      ? (resolvedSearchParams.entry as AuthCookies['entry'])
      : workspaceAuth?.workspaceId
        ? 'workspace'
        : (resolvedSearchParams.entry as AuthCookies['entry']) || 'platform';
  const workspaceId =
    workspaceAuth?.workspaceId ??
    (typeof resolvedSearchParams.workspaceId === 'string'
      ? resolvedSearchParams.workspaceId
      : undefined);
  const planKey = resolvedSearchParams.plan as string | undefined;
  const planName = resolvedSearchParams.planName as string | undefined;
  const returnPath =
    typeof resolvedSearchParams.returnTo === 'string'
      ? resolvedSearchParams.returnTo
      : undefined;
  const message =
    resolvedSearchParams.expired === 'verification'
      ? 'Your verification session expired. Please continue signup again to receive a fresh code.'
      : resolvedSearchParams.reason === 'workspace-moved'
        ? "Continue on your workspace's updated domain and we'll take you right there."
        : undefined;

  const form = (
    <SignupForm
      intent={intent}
      invite={invite}
      entry={entry}
      workspaceId={workspaceId}
      planKey={planKey}
      planName={planName}
      returnPath={returnPath}
      message={message}
      workspaceSurface={Boolean(workspaceAuth)}
      hideTopBrand={Boolean(workspaceAuth)}
    />
  );

  if (workspaceAuth) {
    return (
      <WorkspaceAuthShell workspace={workspaceAuth} mode="signup">
        {form}
      </WorkspaceAuthShell>
    );
  }

  return (
    <PlatformAuthShell mode="signup">
      <SignupForm
        intent={intent}
        invite={invite}
        entry={entry}
        workspaceId={workspaceId}
        planKey={planKey}
        planName={planName}
        returnPath={returnPath}
        message={message}
        hideTopBrand
      />
    </PlatformAuthShell>
  );
}
