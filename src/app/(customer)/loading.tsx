import { RouteSegmentLoadingState } from "@/components/layout/route-segment-loading-state"

export default function CustomerLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching fresh customer data"
      description="Pulling the latest account activity, support updates, and workspace-linked details."
      variant="inline"
      surface="workspace"
    />
  )
}
