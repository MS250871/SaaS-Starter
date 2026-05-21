"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function WorkspaceRouteError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Workspace section unavailable"
      description="This workspace section failed to load completely. Try again to refresh the current route with fresh server data."
      onRetry={reset}
      surface="workspace"
    />
  )
}
