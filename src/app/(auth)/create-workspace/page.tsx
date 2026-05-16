import { getAuthCookie } from '@/lib/auth/auth-cookies';
import { PlatformAuthShell } from '@/modules/auth/components/platform-auth-shell';
import { CreateWorkspaceForm } from '@/modules/workspace/components/create-workspace-form';
import { getWorkspaceRootDomain } from '@/modules/workspace/defaults';

export default async function CreateWorkspacePage() {
  const auth = await getAuthCookie();
  const intent = auth?.intent === 'paid' ? 'paid' : 'free';
  const rootDomain = getWorkspaceRootDomain();

  return (
    <PlatformAuthShell mode="create-workspace">
      <div className="w-full max-w-sm xl:max-w-md">
        <CreateWorkspaceForm
          intent={intent}
          rootDomain={rootDomain}
          hideTopBrand
        />
      </div>
    </PlatformAuthShell>
  );
}
