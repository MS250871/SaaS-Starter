import { WorkspaceCustomersPanel } from '@/modules/workspace/components/workspace-customers-panel';
import { getWorkspaceCustomersPageData } from '@/modules/customer/server/workspace-customers-page-data';

export default async function WorkspaceCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const pageParam =
    typeof resolvedSearchParams.page === 'string'
      ? Number.parseInt(resolvedSearchParams.page, 10)
      : 1;
  const queryParam =
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : null;
  const sourceParam =
    typeof resolvedSearchParams.source === 'string'
      ? resolvedSearchParams.source
      : null;

  const {
    basePath,
    workspaceId,
    customers,
    page,
    pageSize,
    totalItems,
    totalPages,
    filters,
  } = await getWorkspaceCustomersPageData({
    page: pageParam,
    query: queryParam,
    source: sourceParam,
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
    <WorkspaceCustomersPanel
      basePath={basePath}
      customers={customers}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      totalPages={totalPages}
      filters={filters}
    />
  );
}
