"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function CustomerError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Customer portal unavailable"
      description="We hit a problem while loading this customer view. Try again to request a fresh server render."
      onRetry={reset}
      surface="workspace"
    />
  )
}
