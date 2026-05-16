import { WorkspaceBillingPanel } from '@/modules/billing/components/workspace-billing-panel';
import { getWorkspaceBillingPageData } from '@/modules/workspace/server/workspace-admin-page-data';

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
      canManageBilling={
        actor.permissions.includes('subscription.create') ||
        actor.permissions.includes('payment.create')
      }
    />
  );
}
