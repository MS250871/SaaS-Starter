import { PlatformBillingRefundsTable } from '@/modules/platform/components/billing/platform-billing-refunds-table'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingRefundsPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingRefundsPage() {
  await requirePlatformPermission('platformBilling.read')
  const data = await getPlatformBillingRefundsPageData()

  return <PlatformBillingRefundsTable rows={data.rows} />
}
