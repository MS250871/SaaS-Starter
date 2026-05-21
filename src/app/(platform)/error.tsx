"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function PlatformError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Platform view unavailable"
      description="We hit a problem while loading this platform admin screen. Try again to reload the latest server state."
      onRetry={reset}
    />
  )
}
