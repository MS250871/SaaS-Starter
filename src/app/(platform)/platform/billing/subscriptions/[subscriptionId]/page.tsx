import { PlatformBillingSubscriptionDetailView } from '@/modules/platform/components/billing/platform-billing-subscription-detail-view'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingSubscriptionDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  await requirePlatformPermission('platformBilling.read')
  const { subscriptionId } = await params
  const data = await getPlatformBillingSubscriptionDetailPageData(subscriptionId)

  return <PlatformBillingSubscriptionDetailView data={data} />
}
