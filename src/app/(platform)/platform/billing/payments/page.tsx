import { PlatformBillingPaymentsTable } from '@/modules/platform/components/billing/platform-billing-payments-table'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingPaymentsPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingPaymentsPage() {
  await requirePlatformPermission('platformBilling.read')
  const data = await getPlatformBillingPaymentsPageData()

  return <PlatformBillingPaymentsTable rows={data.rows} />
}
