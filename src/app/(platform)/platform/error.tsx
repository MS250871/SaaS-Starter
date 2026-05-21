"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function PlatformRouteError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Platform section unavailable"
      description="This platform section could not finish loading. Try again to request a fresh server render for the current route."
      onRetry={reset}
    />
  )
}
