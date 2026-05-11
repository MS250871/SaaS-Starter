import { DestinationPlaceholder } from '@/components/layout/destination-placeholder';

export default function SelectWorkspacePage() {
  return (
    <DestinationPlaceholder
      route="/select-workspace"
      title="Choose Workspace"
      description="This screen belongs to the post-login flow because it helps a signed-in user choose the workspace context before entering an admin surface."
    />
  );
}
