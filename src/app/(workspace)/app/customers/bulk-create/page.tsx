import { WorkspaceCustomerBulkCreatePanel } from '@/modules/workspace/components/workspace-customer-bulk-create-panel';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

export default async function WorkspaceCustomerBulkCreatePage() {
  const { basePath, workspaceId, workspace } =
    await getWorkspaceAdminSurfaceContext();

  if (!workspaceId || !workspace) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceCustomerBulkCreatePanel
      basePath={basePath}
      workspaceSlug={workspace.slug ?? 'workspace'}
    />
  );
}
