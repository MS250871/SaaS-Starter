import { CustomerSupportCreatePanel } from '@/modules/customer/components/customer-support-create-panel';
import { getCustomerSupportCreatePageData } from '@/modules/support/server/customer-support-page-data';

export default async function CustomerSupportCreatePage() {
  const { basePath, workspaceId, customerId } =
    await getCustomerSupportCreatePageData();

  if (!workspaceId || !customerId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Customer context missing for this route.
        </div>
      </div>
    );
  }

  return <CustomerSupportCreatePanel basePath={basePath} />;
}
