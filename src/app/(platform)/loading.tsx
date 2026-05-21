import { RouteSegmentLoadingState } from "@/components/layout/route-segment-loading-state"

export default function PlatformLoading() {
  return (
    <RouteSegmentLoadingState
      title="Fetching fresh platform data"
      description="Pulling the latest metrics, permissions, and operational signals for this admin workspace."
      variant="inline"
    />
  )
}
