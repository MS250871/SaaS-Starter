import { WorkspaceSupportCreatePanel } from '@/modules/workspace/components/workspace-support-create-panel';
import { getWorkspaceSupportCreatePageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceSupportCreatePage() {
  const { actor, basePath, workspaceId } =
    await getWorkspaceSupportCreatePageData();

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceSupportCreatePanel
      basePath={basePath}
      canCreateTicket={actor.permissions.includes('supportTicket.create')}
    />
  );
}
