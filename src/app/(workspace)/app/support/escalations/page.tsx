import { WorkspaceSupportQueuePanel } from '@/modules/workspace/components/workspace-support-queue-panel';
import { getWorkspaceSupportQueuePageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceSupportEscalationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const pageParam =
    typeof resolvedSearchParams.page === 'string'
      ? Number.parseInt(resolvedSearchParams.page, 10)
      : 1;

  const {
    basePath,
    workspaceId,
    tickets,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    supportSummary,
  } = await getWorkspaceSupportQueuePageData({
    queue: 'platform',
    page: pageParam,
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
      queue="platform"
      tickets={tickets}
      page={page}
      totalPages={totalPages}
      hasPreviousPage={hasPreviousPage}
      hasNextPage={hasNextPage}
      supportSummary={supportSummary}
    />
  );
}
