import { WorkspaceCustomerCreatePanel } from '@/modules/workspace/components/workspace-customer-create-panel';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceCustomerCreatePage() {
  const { basePath, workspaceId } = await getWorkspaceAdminSurfaceContext();

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return <WorkspaceCustomerCreatePanel basePath={basePath} />;
}
