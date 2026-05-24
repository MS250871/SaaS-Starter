import { RouteSegmentLoadingState } from '@/components/layout/route-segment-loading-state';

export default function AuthLoading() {
  return (
    <RouteSegmentLoadingState
      title="Preparing secure access"
      description="Loading the sign-in flow, workspace context, and verification state for this auth screen."
      variant="inline"
    />
  );
}
