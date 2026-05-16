import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { VerifyForm } from '@/modules/auth/components/verify-form';
import { WorkspaceAuthShell } from '@/modules/auth/components/workspace-auth-shell';
import { getWorkspaceAuthPageData } from '@/modules/workspace/server/workspace-auth-page-data';

export default async function VerifyPhonePage() {
  const workspaceAuth = await getWorkspaceAuthPageData();

  const form = (
    <VerifyForm
      mode="phone"
      workspaceSurface={Boolean(workspaceAuth)}
      hideTopBrand={Boolean(workspaceAuth)}
    />
  );

  if (workspaceAuth) {
    return (
      <WorkspaceAuthShell workspace={workspaceAuth} mode="verify-phone">
        {form}
      </WorkspaceAuthShell>
    );
  }

  return (
    <PlatformAuthShell mode="verify-phone">
      <VerifyForm mode="phone" hideTopBrand />
    </PlatformAuthShell>
  );
}
