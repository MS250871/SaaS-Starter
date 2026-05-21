import { RefundReason } from '@/generated/prisma/client'
import { withActionTxContext } from '@/lib/request/withActionContext'
import {
  getPlatformPaymentAdminSnapshot,
  listPaymentsBySubscriptionId,
  listPlatformPaymentAdminSnapshots,
} from '@/modules/billing/services/payment.services'
import {
  getPlatformRefundAdminSnapshot,
  listPlatformRefundAdminSnapshots,
} from '@/modules/billing/services/refund.services'
import {
  getPlatformSubscriptionAdminSnapshot,
  listPlatformSubscriptionAdminSnapshots,
} from '@/modules/billing/services/subscription.services'

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(value)
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A'
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatIdentityName(params: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    'Identity'
  )
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function buildSubscriptionOwnerLabels(params: {
  workspace:
    | {
        name: string
        slug: string
      }
    | null
    | undefined
  identity:
    | {
        firstName: string | null
        lastName: string | null
        email: string | null
      }
    | null
    | undefined
  customer:
    | {
        externalId: string | null
        identity: {
          firstName: string | null
          lastName: string | null
          email: string | null
        }
      }
    | null
    | undefined
}) {
  if (params.customer) {
    return {
      ownerLabel: formatIdentityName({
        firstName: params.customer.identity.firstName,
        lastName: params.customer.identity.lastName,
        email: params.customer.identity.email,
      }),
      ownerSubLabel: params.customer.externalId
        ? `Customer ${params.customer.externalId}`
        : 'Workspace customer',
    }
  }

  if (params.identity) {
    return {
      ownerLabel: formatIdentityName(params.identity),
      ownerSubLabel: 'Identity-linked billing',
    }
  }

  if (params.workspace) {
    return {
      ownerLabel: params.workspace.name,
      ownerSubLabel: params.workspace.slug,
    }
  }

  return {
    ownerLabel: 'Unknown owner',
    ownerSubLabel: 'Unscoped billing record',
  }
}

function buildWorkspaceLabels(
  workspace:
    | {
        id: string
        name: string
        slug: string
        isActive?: boolean
      }
    | null
    | undefined,
  customerWorkspace?:
    | {
        id: string
        name: string
        slug: string
      }
    | null
    | undefined,
) {
  const activeWorkspace = workspace ?? customerWorkspace ?? null

  return {
    workspaceId: activeWorkspace?.id ?? null,
    workspaceName: activeWorkspace?.name ?? 'Unscoped',
    workspaceSlug: activeWorkspace?.slug ?? 'N/A',
  }
}

function buildPaymentRefundReservedAmount(
  refunds: Array<{
    amount: number
    status: string
  }>,
) {
  return roundAmount(
    refunds
      .filter((refund) => !['FAILED', 'CANCELLED'].includes(refund.status))
      .reduce((sum, refund) => sum + refund.amount, 0),
  )
}

export type PlatformBillingSubscriptionRow = {
  id: string
  workspaceId: string | null
  workspaceName: string
  workspaceSlug: string
  workspaceIsActive: boolean
  planName: string
  planKey: string | null
  productName: string
  productCode: string
  intervalLabel: string
  amountLabel: string
  ownerLabel: string
  ownerSubLabel: string
  statusLabel: string
  status: string
  cancelAtPeriodEnd: boolean
  cycleLabel: string
  paymentCount: number
  providerLabel: string
  providerSubscriptionId: string
  createdAtLabel: string
  updatedAtLabel: string
}

export type PlatformBillingPaymentRow = {
  id: string
  workspaceId: string | null
  workspaceName: string
  workspaceSlug: string
  workspaceIsActive: boolean
  paymentLabel: string
  paymentSubLabel: string
  typeLabel: string
  paymentStatusLabel: string
  paymentStatus: string
  amountLabel: string
  ownerLabel: string
  ownerSubLabel: string
  subscriptionId: string | null
  subscriptionStatusLabel: string | null
  invoiceLabel: string
  refundLabel: string
  attemptLabel: string
  providerOrderId: string
  providerPaymentId: string
  capturedAtLabel: string
  createdAtLabel: string
}

export type PlatformBillingPurchaseRow = PlatformBillingPaymentRow

export type PlatformBillingRefundRow = {
  id: string
  paymentId: string
  workspaceId: string | null
  workspaceName: string
  workspaceSlug: string
  workspaceIsActive: boolean
  paymentLabel: string
  amountLabel: string
  reasonLabel: string
  statusLabel: string
  status: string
  providerRefundId: string
  processedAtLabel: string
  createdAtLabel: string
}

function isOneTimePurchasePayment(
  payment: Awaited<ReturnType<typeof listPlatformPaymentAdminSnapshots>>[number],
) {
  return payment.price?.product.type === 'ONE_TIME'
}

function buildPlatformBillingPaymentRow(
  payment: Awaited<ReturnType<typeof listPlatformPaymentAdminSnapshots>>[number],
): PlatformBillingPaymentRow {
  const workspaceLabels = buildWorkspaceLabels(
    payment.workspace,
    payment.customer?.workspace,
  )
  const ownerLabels = buildSubscriptionOwnerLabels({
    workspace: payment.workspace,
    identity: payment.identity,
    customer: payment.customer,
  })

  return {
    id: payment.id,
    workspaceId: workspaceLabels.workspaceId,
    workspaceName: workspaceLabels.workspaceName,
    workspaceSlug: workspaceLabels.workspaceSlug,
    workspaceIsActive: payment.workspace?.isActive ?? true,
    paymentLabel:
      payment.description || payment.price?.product.name || 'Payment',
    paymentSubLabel: payment.price?.product.code ?? payment.id,
    typeLabel: formatEnumLabel(payment.type),
    paymentStatusLabel: formatEnumLabel(payment.paymentStatus),
    paymentStatus: payment.paymentStatus,
    amountLabel: formatCurrency(Number(payment.amount), payment.currency),
    ownerLabel: ownerLabels.ownerLabel,
    ownerSubLabel: ownerLabels.ownerSubLabel,
    subscriptionId: payment.subscriptionId ?? null,
    subscriptionStatusLabel: payment.subscription
      ? formatEnumLabel(payment.subscription.status)
      : null,
    invoiceLabel:
      payment.invoices[0]?.invoiceNumber ?? `${payment._count.invoices} invoices`,
    refundLabel:
      payment.refunds[0]?.status
        ? `${formatEnumLabel(payment.refunds[0].status)} / ${payment._count.refunds}`
        : `${payment._count.refunds} refunds`,
    attemptLabel: `${payment._count.attempts} attempts`,
    providerOrderId: payment.providerOrderId ?? 'N/A',
    providerPaymentId: payment.providerPaymentId ?? 'Pending',
    capturedAtLabel: formatDate(payment.capturedAt),
    createdAtLabel: formatDate(payment.createdAt),
  }
}

export async function getPlatformBillingOverviewData() {
  return withActionTxContext(async () => {
    const [subscriptions, payments, refunds] = await Promise.all([
      listPlatformSubscriptionAdminSnapshots(),
      listPlatformPaymentAdminSnapshots(),
      listPlatformRefundAdminSnapshots(),
    ])
    const oneTimePurchases = payments.filter(isOneTimePurchasePayment)

    const totalInvoices = payments.reduce(
      (sum, payment) => sum + payment._count.invoices,
      0,
    )

    return {
      resources: [
        {
          title: 'Subscriptions',
          href: '/platform/billing/subscriptions',
          description:
            'Track recurring billing anchors, plan ownership, and cycle-end cancellation posture.',
          totalCount: subscriptions.length,
          stats: `${subscriptions.filter((row) => ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(row.status)).length} active - ${subscriptions.filter((row) => row.cancelAtPeriodEnd).length} cancel scheduled`,
        },
        {
          title: 'Payments & Invoices',
          href: '/platform/billing/payments',
          description:
            'Review money movement, invoice issuance, and payment-attempt posture for recurring and one-time billing.',
          totalCount: payments.length,
          stats: `${payments.filter((row) => row.paymentStatus === 'SUCCESS').length} successful - ${totalInvoices} invoices`,
        },
        {
          title: 'One-Time Purchases',
          href: '/platform/billing/purchases',
          description:
            'Review one-time commercial purchases separately from recurring subscriptions and renewals.',
          totalCount: oneTimePurchases.length,
          stats: `${oneTimePurchases.filter((row) => row.paymentStatus === 'SUCCESS').length} successful - ${oneTimePurchases.filter((row) => ['PENDING', 'REQUIRES_ACTION'].includes(row.paymentStatus)).length} pending`,
        },
        {
          title: 'Refunds',
          href: '/platform/billing/refunds',
          description:
            'Inspect provider refund state, upgrade-adjustment reversals, and pending refund operations.',
          totalCount: refunds.length,
          stats: `${refunds.filter((row) => row.status === 'SUCCESS').length} processed - ${refunds.filter((row) => row.status === 'PENDING').length} pending`,
        },
      ],
      summary: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter((row) =>
          ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(row.status),
        ).length,
        totalOneTimePurchases: oneTimePurchases.length,
        successfulOneTimePurchases: oneTimePurchases.filter(
          (row) => row.paymentStatus === 'SUCCESS',
        ).length,
        totalPayments: payments.length,
        successfulPayments: payments.filter(
          (row) => row.paymentStatus === 'SUCCESS',
        ).length,
        totalInvoices,
        totalRefunds: refunds.length,
        pendingRefunds: refunds.filter((row) => row.status === 'PENDING').length,
      },
    }
  })
}

export async function getPlatformBillingSubscriptionsPageData() {
  return withActionTxContext(async () => {
    const subscriptions = await listPlatformSubscriptionAdminSnapshots()

    const rows: PlatformBillingSubscriptionRow[] = subscriptions.map(
      (subscription) => {
        const workspaceLabels = buildWorkspaceLabels(subscription.workspace)
        const ownerLabels = buildSubscriptionOwnerLabels({
          workspace: subscription.workspace,
          identity: subscription.identity,
          customer: subscription.customer,
        })

        return {
          id: subscription.id,
          workspaceId: workspaceLabels.workspaceId,
          workspaceName: workspaceLabels.workspaceName,
          workspaceSlug: workspaceLabels.workspaceSlug,
          workspaceIsActive: subscription.workspace?.isActive ?? true,
          planName: subscription.price.product.plan?.name ?? 'Unlinked plan',
          planKey: subscription.price.product.plan?.key ?? null,
          productName: subscription.price.product.name,
          productCode: subscription.price.product.code,
          intervalLabel: subscription.price.interval
            ? formatEnumLabel(subscription.price.interval)
            : 'One time',
          amountLabel: formatCurrency(
            Number(subscription.price.amount),
            subscription.price.currency,
          ),
          ownerLabel: ownerLabels.ownerLabel,
          ownerSubLabel: ownerLabels.ownerSubLabel,
          statusLabel: formatEnumLabel(subscription.status),
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          cycleLabel: `${formatShortDate(subscription.currentPeriodStart)} -> ${formatShortDate(subscription.currentPeriodEnd)}`,
          paymentCount: subscription._count.payments,
          providerLabel: formatEnumLabel(subscription.provider),
          providerSubscriptionId: subscription.providerSubscriptionId ?? 'N/A',
          createdAtLabel: formatShortDate(subscription.createdAt),
          updatedAtLabel: formatShortDate(subscription.updatedAt),
        }
      },
    )

    return {
      summary: {
        total: rows.length,
        active: rows.filter((row) =>
          ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(row.status),
        ).length,
        cancelScheduled: rows.filter((row) => row.cancelAtPeriodEnd).length,
        workspaceLinked: rows.filter((row) => row.workspaceId !== null).length,
      },
      rows,
    }
  })
}

export async function getPlatformBillingPaymentsPageData() {
  return withActionTxContext(async () => {
    const payments = await listPlatformPaymentAdminSnapshots()

    const rows: PlatformBillingPaymentRow[] =
      payments.map(buildPlatformBillingPaymentRow)

    return {
      summary: {
        total: rows.length,
        success: rows.filter((row) => row.paymentStatus === 'SUCCESS').length,
        pending: rows.filter((row) =>
          ['PENDING', 'REQUIRES_ACTION'].includes(row.paymentStatus),
        ).length,
        failed: rows.filter((row) => row.paymentStatus === 'FAILED').length,
        invoiced: payments.filter((row) => row._count.invoices > 0).length,
      },
      rows,
    }
  })
}

export async function getPlatformBillingPurchasesPageData() {
  return withActionTxContext(async () => {
    const payments = await listPlatformPaymentAdminSnapshots()
    const purchasePayments = payments.filter(isOneTimePurchasePayment)
    const rows: PlatformBillingPurchaseRow[] =
      purchasePayments.map(buildPlatformBillingPaymentRow)

    return {
      summary: {
        total: rows.length,
        success: rows.filter((row) => row.paymentStatus === 'SUCCESS').length,
        pending: rows.filter((row) =>
          ['PENDING', 'REQUIRES_ACTION'].includes(row.paymentStatus),
        ).length,
        failed: rows.filter((row) => row.paymentStatus === 'FAILED').length,
        refunded: purchasePayments.filter((row) => row._count.refunds > 0).length,
      },
      rows,
    }
  })
}

export async function getPlatformBillingRefundsPageData() {
  return withActionTxContext(async () => {
    const refunds = await listPlatformRefundAdminSnapshots()

    const rows: PlatformBillingRefundRow[] = refunds.map((refund) => {
      const workspaceLabels = buildWorkspaceLabels(
        refund.payment.workspace,
        refund.payment.customer?.workspace,
      )

      return {
        id: refund.id,
        paymentId: refund.paymentId,
        workspaceId: workspaceLabels.workspaceId,
        workspaceName: workspaceLabels.workspaceName,
        workspaceSlug: workspaceLabels.workspaceSlug,
        workspaceIsActive: refund.payment.workspace?.isActive ?? true,
        paymentLabel:
          refund.payment.price?.product.name ??
          refund.payment.providerPaymentId ??
          refund.payment.id,
        amountLabel: formatCurrency(Number(refund.amount), refund.currency),
        reasonLabel: formatEnumLabel(refund.reason),
        statusLabel: formatEnumLabel(refund.status),
        status: refund.status,
        providerRefundId: refund.providerRefundId ?? 'Pending',
        processedAtLabel: formatDate(refund.processedAt),
        createdAtLabel: formatDate(refund.createdAt),
      }
    })

    return {
      summary: {
        total: rows.length,
        pending: rows.filter((row) => row.status === 'PENDING').length,
        success: rows.filter((row) => row.status === 'SUCCESS').length,
        failed: rows.filter((row) => row.status === 'FAILED').length,
      },
      rows,
    }
  })
}

export async function getPlatformBillingSubscriptionDetailPageData(
  subscriptionId: string,
) {
  return withActionTxContext(async () => {
    const [subscription, payments] = await Promise.all([
      getPlatformSubscriptionAdminSnapshot(subscriptionId),
      listPaymentsBySubscriptionId(subscriptionId),
    ])

    const workspaceLabels = buildWorkspaceLabels(subscription.workspace)
    const ownerLabels = buildSubscriptionOwnerLabels({
      workspace: subscription.workspace,
      identity: subscription.identity,
      customer: subscription.customer,
    })

    return {
      subscription: {
        id: subscription.id,
        workspaceId: workspaceLabels.workspaceId,
        workspaceName: workspaceLabels.workspaceName,
        workspaceSlug: workspaceLabels.workspaceSlug,
        workspaceIsActive: subscription.workspace?.isActive ?? true,
        ownerLabel: ownerLabels.ownerLabel,
        ownerSubLabel: ownerLabels.ownerSubLabel,
        planName: subscription.price.product.plan?.name ?? 'Unlinked plan',
        planKey: subscription.price.product.plan?.key ?? null,
        productName: subscription.price.product.name,
        productCode: subscription.price.product.code,
        amountLabel: formatCurrency(
          Number(subscription.price.amount),
          subscription.price.currency,
        ),
        intervalLabel: subscription.price.interval
          ? formatEnumLabel(subscription.price.interval)
          : 'One time',
        statusLabel: formatEnumLabel(subscription.status),
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        providerLabel: formatEnumLabel(subscription.provider),
        providerSubscriptionId: subscription.providerSubscriptionId ?? 'N/A',
        currentPeriodStartLabel: formatDate(subscription.currentPeriodStart),
        currentPeriodEndLabel: formatDate(subscription.currentPeriodEnd),
        paymentCount: subscription._count.payments,
        createdAtLabel: formatDate(subscription.createdAt),
        updatedAtLabel: formatDate(subscription.updatedAt),
        canScheduleCancellation:
          !subscription.cancelAtPeriodEnd &&
          ['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'].includes(
            subscription.status,
          ),
      },
      payments: payments.map((payment) => ({
        id: payment.id,
        typeLabel: formatEnumLabel(payment.type),
        statusLabel: formatEnumLabel(payment.paymentStatus),
        amountLabel: formatCurrency(Number(payment.amount), payment.currency),
        createdAtLabel: formatDate(payment.createdAt),
        capturedAtLabel: formatDate(payment.capturedAt),
      })),
    }
  })
}

export async function getPlatformBillingPaymentDetailPageData(paymentId: string) {
  return withActionTxContext(async () => {
    const payment = await getPlatformPaymentAdminSnapshot(paymentId)
    const workspaceLabels = buildWorkspaceLabels(
      payment.workspace,
      payment.customer?.workspace,
    )
    const ownerLabels = buildSubscriptionOwnerLabels({
      workspace: payment.workspace,
      identity: payment.identity,
      customer: payment.customer,
    })
    const refunds = payment.refunds.map((refund) => ({
      id: refund.id,
      amount: Number(refund.amount),
      amountLabel: formatCurrency(Number(refund.amount), refund.currency),
      currency: refund.currency,
      status: refund.status,
      statusLabel: formatEnumLabel(refund.status),
      reasonLabel: formatEnumLabel(refund.reason),
      notes: refund.notes ?? '',
      providerRefundId: refund.providerRefundId ?? 'Pending',
      createdAtLabel: formatDate(refund.createdAt),
      processedAtLabel: formatDate(refund.processedAt),
    }))
    const reservedRefundAmount = buildPaymentRefundReservedAmount(
      refunds.map((refund) => ({
        amount: refund.amount,
        status: refund.status,
      })),
    )
    const refundableAmount = roundAmount(
      Math.max(Number(payment.amount) - reservedRefundAmount, 0),
    )

    return {
      payment: {
        id: payment.id,
        workspaceId: workspaceLabels.workspaceId,
        workspaceName: workspaceLabels.workspaceName,
        workspaceSlug: workspaceLabels.workspaceSlug,
        workspaceIsActive: payment.workspace?.isActive ?? true,
        ownerLabel: ownerLabels.ownerLabel,
        ownerSubLabel: ownerLabels.ownerSubLabel,
        paymentLabel: payment.description || payment.price?.product.name || 'Payment',
        paymentSubLabel: payment.price?.product.code ?? payment.id,
        typeLabel: formatEnumLabel(payment.type),
        paymentStatusLabel: formatEnumLabel(payment.paymentStatus),
        paymentStatus: payment.paymentStatus,
        amountLabel: formatCurrency(Number(payment.amount), payment.currency),
        rawAmount: Number(payment.amount),
        currency: payment.currency,
        providerLabel: formatEnumLabel(payment.paymentProvider),
        providerOrderId: payment.providerOrderId ?? 'N/A',
        providerPaymentId: payment.providerPaymentId ?? 'Pending',
        providerSignature: payment.providerSignature ?? 'N/A',
        planName: payment.price?.product.plan?.name ?? null,
        productName: payment.price?.product.name ?? null,
        intervalLabel: payment.price?.interval
          ? formatEnumLabel(payment.price.interval)
          : 'One time',
        subscriptionId: payment.subscription?.id ?? null,
        subscriptionStatusLabel: payment.subscription
          ? formatEnumLabel(payment.subscription.status)
          : null,
        capturedAtLabel: formatDate(payment.capturedAt),
        createdAtLabel: formatDate(payment.createdAt),
        updatedAtLabel: formatDate(payment.updatedAt),
        attemptCount: payment.attempts.length,
        invoiceCount: payment.invoices.length,
        refundCount: refunds.length,
        refundableAmount,
        refundableAmountLabel: formatCurrency(refundableAmount, payment.currency),
        canRefund:
          payment.paymentStatus === 'SUCCESS' &&
          payment.paymentProvider === 'RAZORPAY' &&
          Boolean(payment.providerPaymentId) &&
          refundableAmount > 0,
      },
      attempts: payment.attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        providerLabel: formatEnumLabel(attempt.provider),
        statusLabel: attempt.status ? formatEnumLabel(attempt.status) : 'Pending',
        errorCode: attempt.errorCode ?? 'N/A',
        errorMessage: attempt.errorMessage ?? 'N/A',
        createdAtLabel: formatDate(attempt.createdAt),
      })),
      invoices: payment.invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        providerInvoiceId: invoice.providerInvoiceId ?? 'N/A',
        amountLabel: formatCurrency(Number(invoice.amount), invoice.currency),
        statusLabel: formatEnumLabel(invoice.status),
        issuedAtLabel: formatDate(invoice.issuedAt),
        paidAtLabel: formatDate(invoice.paidAt),
        items: invoice.items.map((item) => ({
          id: item.id,
          productLabel: item.product?.name ?? item.product?.code ?? 'Invoice item',
          quantity: item.quantity,
          unitPriceLabel: formatCurrency(Number(item.unitPrice), item.currency),
          totalLabel: formatCurrency(Number(item.total), item.currency),
          intervalLabel: item.price?.interval
            ? formatEnumLabel(item.price.interval)
            : 'One time',
        })),
      })),
      refunds,
    }
  })
}

export async function getPlatformBillingRefundDetailPageData(refundId: string) {
  return withActionTxContext(async () => {
    const refund = await getPlatformRefundAdminSnapshot(refundId)
    const workspaceLabels = buildWorkspaceLabels(
      refund.payment.workspace,
      refund.payment.customer?.workspace,
    )
    const ownerLabels = buildSubscriptionOwnerLabels({
      workspace: refund.payment.workspace,
      identity: refund.payment.identity,
      customer: refund.payment.customer,
    })

    return {
      refund: {
        id: refund.id,
        paymentId: refund.paymentId,
        workspaceId: workspaceLabels.workspaceId,
        workspaceName: workspaceLabels.workspaceName,
        workspaceSlug: workspaceLabels.workspaceSlug,
        workspaceIsActive: refund.payment.workspace?.isActive ?? true,
        ownerLabel: ownerLabels.ownerLabel,
        ownerSubLabel: ownerLabels.ownerSubLabel,
        paymentLabel:
          refund.payment.price?.product.name ??
          refund.payment.providerPaymentId ??
          refund.payment.id,
        paymentTypeLabel: formatEnumLabel(refund.payment.type),
        paymentStatusLabel: formatEnumLabel(refund.payment.paymentStatus),
        amountLabel: formatCurrency(Number(refund.amount), refund.currency),
        rawAmount: Number(refund.amount),
        currency: refund.currency,
        reasonLabel: formatEnumLabel(refund.reason ?? RefundReason.USER_REQUEST),
        notes: refund.notes ?? '',
        statusLabel: formatEnumLabel(refund.status),
        status: refund.status,
        providerLabel: formatEnumLabel(refund.paymentProvider),
        providerRefundId: refund.providerRefundId ?? 'Pending',
        providerPaymentId: refund.payment.providerPaymentId ?? 'Pending',
        planName: refund.payment.price?.product.plan?.name ?? null,
        productName: refund.payment.price?.product.name ?? null,
        createdAtLabel: formatDate(refund.createdAt),
        updatedAtLabel: formatDate(refund.updatedAt),
        processedAtLabel: formatDate(refund.processedAt),
      },
    }
  })
}
