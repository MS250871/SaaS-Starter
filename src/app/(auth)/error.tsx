"use client"

import { RouteSegmentErrorState } from "@/components/layout/route-segment-error-state"

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteSegmentErrorState
      title="Authentication screen unavailable"
      description="We could not finish loading this authentication step. Try again to reload the latest secure flow."
      onRetry={reset}
    />
  )
}
