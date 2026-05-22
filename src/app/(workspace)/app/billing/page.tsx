import { WorkspaceBillingPanel } from '@/modules/billing/components/workspace-billing-panel';
import { getWorkspaceBillingPageData } from '@/modules/billing/server/workspace-billing-page-data';
import { hasAnyPermission } from '@/modules/permissions/services/permissions.services';

export default async function WorkspaceBillingPage() {
  const {
    actor,
    workspaceId,
    activeSubscription,
    payments,
    invoices,
    oneTimeOffers,
    billingConfig,
  } = await getWorkspaceBillingPageData();

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
    <WorkspaceBillingPanel
      activeSubscription={activeSubscription}
      payments={payments}
      invoices={invoices}
      oneTimeOffers={oneTimeOffers}
      billingConfig={billingConfig}
      canManageBilling={hasAnyPermission(actor.permissions, [
        'subscription.create',
        'payment.create',
      ])}
    />
  );
}
