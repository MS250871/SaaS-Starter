import { CustomerSupportQueuePanel } from '@/modules/customer/components/customer-support-queue-panel';
import { getCustomerSupportQueuePageData } from '@/modules/support/server/customer-support-page-data';

export default async function CustomerSupportPage({
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
    customerId,
    tickets,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    supportSummary,
  } = await getCustomerSupportQueuePageData({
    page: pageParam,
  });

  if (!workspaceId || !customerId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Customer context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <CustomerSupportQueuePanel
      basePath={basePath}
      tickets={tickets}
      page={page}
      totalPages={totalPages}
      hasPreviousPage={hasPreviousPage}
      hasNextPage={hasNextPage}
      supportSummary={supportSummary}
    />
  );
}
