import { PlatformBillingPaymentsTable } from '@/modules/platform/components/billing/platform-billing-payments-table'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingPurchasesPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingPurchasesPage() {
  await requirePlatformPermission('platformBilling.read')
  const data = await getPlatformBillingPurchasesPageData()

  return (
    <PlatformBillingPaymentsTable
      rows={data.rows}
      title="One-Time Purchases"
      searchPlaceholder="Search one-time purchases by workspace, owner, product, provider ids, or status"
      emptyStateTitle="No one-time purchases found"
      emptyStateDescription="One-time purchases will appear here once direct commercial transactions start."
      secondaryActions={[
        {
          label: 'Subscriptions',
          href: '/platform/billing/subscriptions',
          variant: 'outline',
        },
        {
          label: 'Payments & Invoices',
          href: '/platform/billing/payments',
          variant: 'outline',
        },
        {
          label: 'Refunds',
          href: '/platform/billing/refunds',
          variant: 'outline',
        },
      ]}
    />
  )
}
