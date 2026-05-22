import { WorkspaceSupportCreatePanel } from '@/modules/workspace/components/workspace-support-create-panel';
import { getWorkspaceSupportCreatePageData } from '@/modules/support/server/workspace-support-page-data';
import { hasPermission } from '@/modules/permissions/services/permissions.services';

export default async function WorkspaceSupportCreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { actor, basePath, workspaceId, customerOptions } =
    await getWorkspaceSupportCreatePageData();
  const defaultTarget =
    resolvedSearchParams.target === 'platform' ? 'platform' : 'customer';

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
      canCreateTicket={hasPermission(actor.permissions, 'supportTicket.create')}
      defaultTarget={defaultTarget}
      customerOptions={customerOptions}
    />
  );
}
