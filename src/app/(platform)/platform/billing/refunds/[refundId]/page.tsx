import { PlatformBillingRefundDetailView } from '@/modules/platform/components/billing/platform-billing-refund-detail-view'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingRefundDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingRefundDetailPage({
  params,
}: {
  params: Promise<{ refundId: string }>
}) {
  await requirePlatformPermission('platformBilling.read')
  const { refundId } = await params
  const data = await getPlatformBillingRefundDetailPageData(refundId)

  return <PlatformBillingRefundDetailView data={data} />
}
