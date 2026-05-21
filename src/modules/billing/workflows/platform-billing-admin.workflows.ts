import { withUnitOfWork } from '@/lib/context/unit-of-work'
import { ERR } from '@/lib/errors/codes'
import { throwError } from '@/lib/errors/app-error'
import {
  createRazorpayPaymentRefund,
  cancelRazorpaySubscription,
  toRazorpayAmountSubunits,
} from '@/lib/payments/razorpay'
import type { Prisma, RefundReason } from '@/generated/prisma/client'
import type {
  PlatformBillingRefundPaymentActionInput,
  PlatformBillingCancelSubscriptionActionInput,
} from '@/modules/billing/schema'
import { getPaymentById } from '@/modules/billing/services/payment.services'
import {
  createRefund,
  listRefundsByPaymentId,
  updateRefund,
} from '@/modules/billing/services/refund.services'
import {
  getSubscriptionById,
  updateSubscription,
} from '@/modules/billing/services/subscription.services'

function toJsonInput(value: unknown) {
  return value as Prisma.InputJsonValue
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function mapRazorpayRefundStatus(status?: string | null) {
  switch (status) {
    case 'processed':
      return 'SUCCESS' as const
    case 'failed':
      return 'FAILED' as const
    case 'cancelled':
      return 'CANCELLED' as const
    default:
      return 'PENDING' as const
  }
}

export async function schedulePlatformSubscriptionCancellationWorkflow(
  input: PlatformBillingCancelSubscriptionActionInput,
) {
  const subscription = await withUnitOfWork(() =>
    getSubscriptionById(input.subscriptionId),
  )

  if (!['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'].includes(subscription.status)) {
    throwError(
      ERR.INVALID_STATE,
      'Only active, trialing, past-due, or incomplete subscriptions can be scheduled for cancellation.',
    )
  }

  if (subscription.cancelAtPeriodEnd) {
    throwError(
      ERR.INVALID_STATE,
      'This subscription is already scheduled to cancel at the end of the current period.',
    )
  }

  if (subscription.provider === 'RAZORPAY' && subscription.providerSubscriptionId) {
    await cancelRazorpaySubscription(subscription.providerSubscriptionId, true)
  }

  return withUnitOfWork(() =>
    updateSubscription(subscription.id, {
      cancelAtPeriodEnd: true,
    }),
  )
}

export async function refundPlatformPaymentWorkflow(
  input: PlatformBillingRefundPaymentActionInput,
) {
  const payment = await withUnitOfWork(() => getPaymentById(input.paymentId))

  if (payment.paymentProvider !== 'RAZORPAY') {
    throwError(ERR.INVALID_STATE, 'Only Razorpay payments can be refunded today.')
  }

  if (payment.paymentStatus !== 'SUCCESS') {
    throwError(
      ERR.INVALID_STATE,
      'Only successful payments can be refunded from the platform admin.',
    )
  }

  if (!payment.providerPaymentId) {
    throwError(
      ERR.INVALID_STATE,
      'This payment is missing a provider payment id and cannot be refunded.',
    )
  }

  const existingRefunds = await withUnitOfWork(() =>
    listRefundsByPaymentId(payment.id),
  )
  const reservedRefundAmount = roundAmount(
    existingRefunds
      .filter((refund) => !['FAILED', 'CANCELLED'].includes(refund.status))
      .reduce((sum, refund) => sum + Number(refund.amount), 0),
  )
  const paymentAmount = Number(payment.amount)
  const remainingRefundAmount = roundAmount(
    Math.max(paymentAmount - reservedRefundAmount, 0),
  )

  if (remainingRefundAmount <= 0) {
    throwError(ERR.INVALID_STATE, 'This payment has already been fully refunded.')
  }

  const requestedAmount = roundAmount(input.amount ?? remainingRefundAmount)

  if (requestedAmount <= 0) {
    throwError(ERR.INVALID_INPUT, 'Refund amount must be greater than zero.')
  }

  if (requestedAmount > remainingRefundAmount) {
    throwError(
      ERR.INVALID_INPUT,
      `Refund amount cannot exceed the remaining refundable amount of ${remainingRefundAmount.toFixed(2)} ${payment.currency}.`,
    )
  }

  const refund = await withUnitOfWork(() =>
    createRefund({
      paymentId: payment.id,
      amount: requestedAmount,
      currency: payment.currency,
      status: 'PENDING',
      reason: (input.reason as RefundReason | undefined) ?? 'USER_REQUEST',
      notes: input.notes || null,
      paymentProvider: payment.paymentProvider,
      metadata: toJsonInput({
        source: 'platform_admin',
        remainingRefundAmount,
      }),
    }),
  )

  try {
    const providerRefund = await createRazorpayPaymentRefund(
      payment.providerPaymentId,
      {
        amountSubunits: toRazorpayAmountSubunits(requestedAmount),
        speed: 'normal',
        receipt: `refund_${refund.id.slice(0, 18)}`,
        notes: {
          source: 'platform_admin',
          paymentId: payment.id,
        },
      },
    )

    return withUnitOfWork(() =>
      updateRefund(refund.id, {
        providerRefundId: providerRefund.id,
        status: mapRazorpayRefundStatus(providerRefund.status),
        processedAt:
          providerRefund.status === 'processed' ? new Date() : undefined,
        metadata: toJsonInput({
          source: 'platform_admin',
          providerStatus: providerRefund.status,
          remainingRefundAmount,
        }),
      }),
    )
  } catch (error) {
    await withUnitOfWork(() =>
      updateRefund(refund.id, {
        status: 'FAILED',
        metadata: toJsonInput({
          source: 'platform_admin',
          remainingRefundAmount,
          error: error instanceof Error ? error.message : 'Refund request failed',
        }),
      }),
    )

    throw error
  }
}
