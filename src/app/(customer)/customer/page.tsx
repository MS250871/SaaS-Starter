import { DestinationPlaceholder } from '@/components/layout/destination-placeholder';

export default function CustomerPage() {
  return (
    <DestinationPlaceholder
      route="/customer"
      title="Customer App Placeholder"
      description="This is a temporary landing page for customer users after post-login. It confirms the customer branch of the auth flow is now reachable."
    />
  );
}
