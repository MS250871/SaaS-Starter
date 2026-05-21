import { WorkspaceCustomersPanel } from '@/modules/workspace/components/workspace-customers-panel';
import { getWorkspaceCustomersPageData } from '@/modules/customer/server/workspace-customers-page-data';

export default async function WorkspaceCustomersPage() {
  const {
    basePath,
    workspaceId,
    customers,
  } = await getWorkspaceCustomersPageData();

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
    <WorkspaceCustomersPanel
      basePath={basePath}
      customers={customers}
    />
  );
}
