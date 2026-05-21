"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function CustomerRouteError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Customer section unavailable"
      description="This customer section failed to finish loading. Try again to reload the current customer route."
      onRetry={reset}
      surface="workspace"
    />
  )
}
