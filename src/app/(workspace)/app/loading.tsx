import { RouteSegmentLoadingState } from "@/components/layout/route-segment-loading-state"

export default function WorkspaceRouteLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching fresh workspace data"
      description="Pulling the latest people, routing, billing, and support data for this workspace."
      variant="inline"
      surface="workspace"
    />
  )
}
