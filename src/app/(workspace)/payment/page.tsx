import { DestinationPlaceholder } from '@/components/layout/destination-placeholder';
import { getAuthCookie } from '@/lib/auth/auth-cookies';

export default async function PaymentPage() {
  const auth = await getAuthCookie();
  const selectedPlan = auth?.planName ?? auth?.planKey ?? 'selected';

  return (
    <DestinationPlaceholder
      route="/payment"
      title="Payment Placeholder"
      description={`This is the next onboarding step for the ${selectedPlan} plan. Razorpay checkout will be wired here before workspace creation.`}
    />
  );
}
