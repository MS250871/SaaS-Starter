'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActionToast } from '@/hooks/use-action-toast'
import { refundPlatformPaymentAction } from '@/modules/billing/actions/platform-billing-admin.actions'

const refundReasonOptions = [
  'USER_REQUEST',
  'DUPLICATE',
  'FRAUD',
  'PAYMENT_ERROR',
  'UPGRADE_ADJUSTMENT',
  'DOWNGRADE_ADJUSTMENT',
  'OTHER',
] as const

type RefundReasonValue = (typeof refundReasonOptions)[number]

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function PlatformBillingRefundPanel({
  paymentId,
  defaultAmount,
  amountLabel,
  canRefund,
}: {
  paymentId: string
  defaultAmount: number
  amountLabel: string
  canRefund: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { showActionError, showActionSuccess } = useActionToast()
  const [amount, setAmount] = useState(
    defaultAmount > 0 ? defaultAmount.toFixed(2) : '',
  )
  const [reason, setReason] = useState<RefundReasonValue>('USER_REQUEST')
  const [notes, setNotes] = useState('')

  const helperText = useMemo(() => {
    if (!canRefund) {
      return 'This payment is not eligible for a platform-initiated refund.'
    }

    return `Maximum refundable amount right now: ${amountLabel}`
  }, [amountLabel, canRefund])

  const runRefund = () => {
    if (!canRefund) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('paymentId', paymentId)

      if (amount.trim()) {
        formData.set('amount', amount.trim())
      }

      formData.set('reason', reason)
      formData.set('notes', notes)

      const response = await refundPlatformPaymentAction(formData)

      if (!response.success) {
        showActionError(response.error)
        return
      }

      showActionSuccess(response.data.successMessage, 'Refund submitted.')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="refund-amount">Refund amount</Label>
        <Input
          id="refund-amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          disabled={!canRefund || isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="refund-reason">Reason</Label>
        <select
          id="refund-reason"
          value={reason}
          onChange={(event) =>
            setReason(event.target.value as RefundReasonValue)
          }
          disabled={!canRefund || isPending}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
        >
          {refundReasonOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="refund-notes">Notes</Label>
        <Textarea
          id="refund-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional internal note for why this refund is being issued."
          disabled={!canRefund || isPending}
        />
      </div>

      <p className="text-sm text-muted-foreground">{helperText}</p>

      <Button onClick={runRefund} disabled={!canRefund || isPending}>
        {isPending ? 'Submitting refund...' : 'Issue refund'}
      </Button>
    </div>
  )
}
