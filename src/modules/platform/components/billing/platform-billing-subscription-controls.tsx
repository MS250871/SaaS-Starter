'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useActionToast } from '@/hooks/use-action-toast'
import { schedulePlatformSubscriptionCancellationAction } from '@/modules/billing/actions/platform-billing-admin.actions'

export function PlatformBillingSubscriptionControls({
  subscriptionId,
  canScheduleCancellation,
}: {
  subscriptionId: string
  canScheduleCancellation: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { showActionError, showActionSuccess } = useActionToast()

  if (!canScheduleCancellation) {
    return (
      <p className="text-sm text-muted-foreground">
        No platform-side cancellation action is available for this subscription in
        its current state.
      </p>
    )
  }

  const runScheduleCancellation = () => {
    const confirmed = window.confirm(
      'Schedule this subscription to cancel at the end of the current billing period?',
    )

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('subscriptionId', subscriptionId)

      const response =
        await schedulePlatformSubscriptionCancellationAction(formData)

      if (!response.success) {
        showActionError(response.error)
        return
      }

      showActionSuccess(
        response.data.successMessage,
        'Subscription cancellation was scheduled.',
      )
      router.refresh()
    })
  }

  return (
    <Button onClick={runScheduleCancellation} disabled={isPending}>
      {isPending ? 'Scheduling cancellation...' : 'Cancel at cycle end'}
    </Button>
  )
}
