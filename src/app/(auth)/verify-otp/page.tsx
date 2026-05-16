import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { VerifyForm } from '@/modules/auth/components/verify-form';
import { WorkspaceAuthShell } from '@/modules/auth/components/workspace-auth-shell';
import { getWorkspaceAuthPageData } from '@/modules/workspace/server/workspace-auth-page-data';

type Mode = 'email' | 'phone';

async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const mode = (resolvedSearchParams.mode as Mode) || 'email';
  const workspaceAuth = await getWorkspaceAuthPageData();

  const form = (
    <VerifyForm
      mode={mode}
      workspaceSurface={Boolean(workspaceAuth)}
      hideTopBrand={Boolean(workspaceAuth)}
    />
  );

  if (workspaceAuth) {
    return (
      <WorkspaceAuthShell
        workspace={workspaceAuth}
        mode={mode === 'phone' ? 'verify-phone' : 'verify-email'}
      >
        {form}
      </WorkspaceAuthShell>
    );
  }

  return (
    <PlatformAuthShell mode={mode === 'phone' ? 'verify-phone' : 'verify-email'}>
      <VerifyForm mode={mode} hideTopBrand />
    </PlatformAuthShell>
  );
}

export default VerifyOtpPage;
