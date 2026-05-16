import { PaymentCheckoutPanel } from '@/modules/billing/components/payment-checkout-panel';
import { getPaymentPageData } from '@/modules/billing/server/payment-page-data';

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getPaymentPageData(resolvedSearchParams);

  return <PaymentCheckoutPanel {...data} />;
}
