import { DestinationPlaceholder } from '@/components/layout/destination-placeholder';
import { getAuthCookie } from '@/lib/auth/auth-cookies';

function formatUpgradeLabel(value?: string) {
  if (value === 'subdomain') {
    return 'subdomain routing'
  }

  if (value === 'custom-domain') {
    return 'white-label custom domains'
  }

  return null
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const auth = await getAuthCookie();
  const resolvedSearchParams = await searchParams
  const selectedPlan =
    (resolvedSearchParams.planName as string | undefined) ??
    (resolvedSearchParams.plan as string | undefined) ??
    auth?.planName ??
    auth?.planKey ??
    'selected'
  const upgradeLabel = formatUpgradeLabel(
    resolvedSearchParams.upgrade as string | undefined,
  )

  return (
    <DestinationPlaceholder
      route="/payment"
      title="Payment"
      description={
        upgradeLabel
          ? `Continue with the ${selectedPlan} upgrade to unlock ${upgradeLabel}. This payment step stays outside the admin shell, but can now be reached directly from workspace settings.`
          : `This ${selectedPlan} payment step stays outside the admin shell because it is part of onboarding and account activation, not ongoing workspace administration.`
      }
    />
  );
}
