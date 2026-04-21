import { DestinationPlaceholder } from '@/components/layout/destination-placeholder';

export default function DashboardPage() {
  return (
    <DestinationPlaceholder
      route="/dashboard"
      title="Dashboard Placeholder"
      description="This is a fallback dashboard placeholder so generic signed-in redirects have a safe destination while the real app surfaces are being built."
    />
  );
}
