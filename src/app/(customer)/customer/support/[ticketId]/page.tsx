import { CustomerSupportThreadPanel } from '@/modules/customer/components/customer-support-thread-panel';
import { getCustomerSupportThreadPageData } from '@/modules/support/server/customer-support-page-data';

export default async function CustomerSupportThreadPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { workspaceId, customerId, selectedTicket, backHref } =
    await getCustomerSupportThreadPageData(ticketId);

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
    <CustomerSupportThreadPanel
      backHref={backHref}
      selectedTicket={selectedTicket}
    />
  );
}
