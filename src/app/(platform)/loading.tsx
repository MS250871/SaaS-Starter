import { RouteSegmentLoadingState } from '@/components/layout/route-segment-loading-state';

export default function PlatformLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching Data"
      description="Pulling the latest data for this admin workspace."
      variant="inline"
    />
  );
}
