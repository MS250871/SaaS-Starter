import { PlatformBillingSubscriptionsTable } from '@/modules/platform/components/billing/platform-billing-subscriptions-table'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingSubscriptionsPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingSubscriptionsPage() {
  await requirePlatformPermission('platformBilling.read')
  const data = await getPlatformBillingSubscriptionsPageData()

  return <PlatformBillingSubscriptionsTable rows={data.rows} />
}
