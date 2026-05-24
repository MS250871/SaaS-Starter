import { RouteSegmentLoadingState } from '@/components/layout/route-segment-loading-state';

export default function WorkspaceLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching Data"
      description="Pulling the latest data for this workspace."
      variant="inline"
      surface="workspace"
    />
  );
}
