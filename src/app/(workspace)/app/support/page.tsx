import { getWorkspaceSupportQueuePageData } from '@/modules/support/server/workspace-support-page-data';
import { WorkspaceSupportQueuePanel } from '@/modules/workspace/components/workspace-support-queue-panel';

export default async function WorkspaceSupportPage() {
  const {
    basePath,
    workspaceId,
    tickets,
    supportSummary,
  } = await getWorkspaceSupportQueuePageData({
    queue: 'workspace',
  });

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
    <WorkspaceSupportQueuePanel
      basePath={basePath}
      queue="workspace"
      tickets={tickets}
      supportSummary={supportSummary}
    />
  );
}
