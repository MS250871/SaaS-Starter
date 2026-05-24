import { RouteSegmentLoadingState } from '@/components/layout/route-segment-loading-state';

export default function CustomerLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching Data"
      description="Pulling the latest data for you."
      variant="inline"
    />
  );
}
