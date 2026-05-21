"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Workspace view unavailable"
      description="We could not finish loading this workspace screen. Try again to refresh the latest workspace data and permissions."
      onRetry={reset}
      surface="workspace"
    />
  )
}
