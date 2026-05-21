import { PlatformBillingPaymentDetailView } from '@/modules/platform/components/billing/platform-billing-payment-detail-view'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import { getPlatformBillingPaymentDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>
}) {
  await requirePlatformPermission('platformBilling.read')
  const { paymentId } = await params
  const data = await getPlatformBillingPaymentDetailPageData(paymentId)

  return <PlatformBillingPaymentDetailView data={data} />
}
