import { fromRazorpayAmountSubunits } from '@/lib/payments/razorpay';
import type {
  Currency,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@/generated/prisma/client';
import { extractAppError, throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { invalidateWorkspaceBillingCaches } from '@/modules/billing/services/billing-cache.services';
import { invalidateWorkspaceEntitlementsCache } from '@/modules/entitlements/services/entitlement-cache.services';
import {
  claimWebhookEventForProcessing,
  getWebhookEventById,
  markWebhookEventProcessed,
  scheduleWebhookEventRetry,
} from '@/modules/integration/services/webhook-event.services';
import {
  type PriceCheckoutSnapshot,
  getPriceCheckoutSnapshotById,
} from '@/modules/billing/services/catalog.services';
import {
  buildInvoiceNumber,
  createInvoice,
  createInvoiceItem,
  findInvoiceByPaymentId,
  updateInvoice,
} from '@/modules/billing/services/invoice.services';
import {
  countPaymentAttempts,
  createPayment,
  createPaymentAttempt,
  findPaymentByProviderOrderId,
  findPaymentByProviderPaymentId,
  findPendingProratedUpgradePaymentBySubscriptionId,
  updatePayment,
} from '@/modules/billing/services/payment.services';
import {
  findLatestRefundByPaymentId,
  findRefundByProviderRefundId,
  updateRefund,
} from '@/modules/billing/services/refund.services';
import {
  findSubscriptionByProviderId,
  getSubscriptionById,
  updateSubscription,
} from '@/modules/billing/services/subscription.services';
import { syncWorkspaceBillingSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        status?: string;
        amount?: number;
        currency?: string;
        order_id?: string | null;
        invoice_id?: string | null;
        subscription_id?: string | null;
        created_at?: number;
        notes?: Record<string, string | number>;
      };
    };
    subscription?: {
      entity?: {
        id: string;
        status?: string;
        current_start?: number | null;
        current_end?: number | null;
        paid_count?: number;
        notes?: Record<string, string | number>;
      };
    };
    invoice?: {
      entity?: {
        id: string;
      };
    };
    refund?: {
      entity?: {
        id: string;
        payment_id?: string | null;
        amount?: number;
        currency?: string;
        status?: string | null;
        created_at?: number;
        notes?: Record<string, string | number>;
      };
    };
  };
};

function mapPaymentStatus(status?: string | null) {
  switch (status) {
    case 'captured':
    case 'authorized':
      return 'SUCCESS' as const;
    case 'failed':
      return 'FAILED' as const;
    case 'created':
      return 'REQUIRES_ACTION' as const;
    default:
      return 'PENDING' as const;
  }
}

function mapSubscriptionStatus(status?: string | null) {
  switch (status) {
    case 'active':
    case 'authenticated':
      return 'ACTIVE' as const;
    case 'pending':
    case 'halted':
      return 'PAST_DUE' as const;
    case 'cancelled':
      return 'CANCELLED' as const;
    case 'completed':
    case 'expired':
      return 'EXPIRED' as const;
    default:
      return 'INCOMPLETE' as const;
  }
}

function mapRefundStatus(status?: string | null): RefundStatus {
  switch (status) {
    case 'processed':
      return 'SUCCESS';
    case 'failed':
      return 'FAILED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

function toJsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function toCurrency(
  value?: string | null,
  fallback: Currency = 'INR',
): Currency {
  switch (value?.toUpperCase()) {
    case 'USD':
    case 'EUR':
    case 'GBP':
    case 'INR':
    case 'AUD':
    case 'CAD':
      return value.toUpperCase() as Currency;
    default:
      return fallback;
  }
}

async function ensureInvoiceForWebhookPayment(params: {
  paymentId: string;
  priceId: string;
  workspaceId?: string | null;
  identityId?: string | null;
  amount: number;
  currency: Currency;
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  providerInvoiceId?: string | null;
}) {
  const existingInvoice = await findInvoiceByPaymentId(params.paymentId);

  if (existingInvoice) {
    if (
      params.providerInvoiceId &&
      existingInvoice.providerInvoiceId !== params.providerInvoiceId
    ) {
      await updateInvoice(existingInvoice.id, {
        providerInvoiceId: params.providerInvoiceId,
      });
    }

    return existingInvoice;
  }

  const price: PriceCheckoutSnapshot = await getPriceCheckoutSnapshotById(
    params.priceId,
  );

  const invoice = await createInvoice({
    paymentId: params.paymentId,
    workspaceId: params.workspaceId ?? undefined,
    identityId: params.identityId ?? undefined,
    invoiceNumber: buildInvoiceNumber(),
    providerInvoiceId: params.providerInvoiceId ?? undefined,
    amount: params.amount,
    currency: params.currency,
    status: params.paymentStatus,
    issuedAt: params.paidAt ?? new Date(),
    paidAt: params.paidAt ?? null,
  });

  await createInvoiceItem({
    invoiceId: invoice.id,
    productId: price.product.id,
    priceId: price.id,
    quantity: 1,
    unitPrice: params.amount,
    total: params.amount,
    currency: params.currency,
    metadata: toJsonInput({
      productCode: price.product.code,
    }),
  });

  return invoice;
}

async function updatePaymentFromWebhook(paymentEntity: NonNullable<
  NonNullable<RazorpayWebhookPayload['payload']>['payment']
>['entity']) {
  if (!paymentEntity?.id) {
    return;
  }

  const localPayment =
    (await findPaymentByProviderPaymentId(paymentEntity.id)) ??
    (paymentEntity.order_id
      ? await findPaymentByProviderOrderId(paymentEntity.order_id)
      : null);

  if (!localPayment) {
    return;
  }

  const paymentStatus = mapPaymentStatus(paymentEntity.status);

  await updatePayment(localPayment.id, {
    providerPaymentId: paymentEntity.id,
    providerOrderId: paymentEntity.order_id ?? localPayment.providerOrderId ?? undefined,
    paymentStatus,
    capturedAt:
      paymentEntity.status === 'captured' || paymentEntity.status === 'authorized'
        ? new Date((paymentEntity.created_at ?? Date.now() / 1000) * 1000)
        : null,
  });

  if (localPayment.priceId) {
    await ensureInvoiceForWebhookPayment({
      paymentId: localPayment.id,
      priceId: localPayment.priceId,
      workspaceId: localPayment.workspaceId,
      identityId: localPayment.identityId,
      amount: Number(localPayment.amount),
      currency: localPayment.currency,
      paymentStatus,
      paidAt:
        paymentEntity.status === 'captured' || paymentEntity.status === 'authorized'
          ? new Date((paymentEntity.created_at ?? Date.now() / 1000) * 1000)
          : undefined,
      providerInvoiceId: paymentEntity.invoice_id ?? null,
    });
  }

  const attemptNumber =
    (await countPaymentAttempts(localPayment.id).catch(() => 0)) + 1;

  await createPaymentAttempt({
    paymentId: localPayment.id,
    attemptNumber,
    provider: 'RAZORPAY',
    status: paymentEntity.status ?? undefined,
    responsePayload: toJsonInput(paymentEntity),
  }).catch(() => null);
}

async function updateSubscriptionFromWebhook(params: {
  subscriptionEntity: NonNullable<
    NonNullable<RazorpayWebhookPayload['payload']>['subscription']
  >['entity'];
  paymentEntity?: NonNullable<
    NonNullable<RazorpayWebhookPayload['payload']>['payment']
  >['entity'];
  providerInvoiceId?: string | null;
}) {
  if (!params.subscriptionEntity?.id) {
    return;
  }

  const localSubscription = await findSubscriptionByProviderId(
    'RAZORPAY',
    params.subscriptionEntity.id,
  );

  if (!localSubscription) {
    return;
  }

  const subscription = await getSubscriptionById(localSubscription.id);
  const nextStatus = mapSubscriptionStatus(params.subscriptionEntity.status);
  const periodStart =
    params.subscriptionEntity.current_start != null
      ? new Date(params.subscriptionEntity.current_start * 1000)
      : subscription.currentPeriodStart;
  const periodEnd =
    params.subscriptionEntity.current_end != null
      ? new Date(params.subscriptionEntity.current_end * 1000)
      : subscription.currentPeriodEnd;

  await updateSubscription(subscription.id, {
    status: nextStatus,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    providerSubscriptionId: params.subscriptionEntity.id,
  });

  const price: PriceCheckoutSnapshot = await getPriceCheckoutSnapshotById(
    subscription.priceId,
  );

  if (subscription.workspaceId && price.product.plan?.key) {
    await syncWorkspaceBillingSettings({
      workspaceId: subscription.workspaceId,
      planCode: price.product.plan.key,
      subscriptionStatus: nextStatus,
    });

    await invalidateWorkspaceEntitlementsCache(subscription.workspaceId);
    await syncWorkspaceRoutingState(subscription.workspaceId);
    await invalidateWorkspaceBillingCaches(subscription.workspaceId);
  }

  if (!params.paymentEntity?.id) {
    return;
  }

  const existingPayment =
    (await findPaymentByProviderPaymentId(params.paymentEntity.id)) ??
    (await findPendingProratedUpgradePaymentBySubscriptionId(subscription.id));

  if (existingPayment) {
    await updatePayment(existingPayment.id, {
      paymentStatus: mapPaymentStatus(params.paymentEntity.status),
      providerPaymentId: params.paymentEntity.id,
      providerOrderId:
        params.paymentEntity.order_id ?? existingPayment.providerOrderId ?? undefined,
      capturedAt:
        params.paymentEntity.status === 'captured' ||
        params.paymentEntity.status === 'authorized'
          ? new Date(
              (params.paymentEntity.created_at ?? Date.now() / 1000) * 1000,
            )
          : null,
    });

    await ensureInvoiceForWebhookPayment({
      paymentId: existingPayment.id,
      priceId: subscription.priceId,
      workspaceId: subscription.workspaceId,
      identityId: subscription.identityId,
      amount: Number(existingPayment.amount),
      currency: existingPayment.currency,
      paymentStatus: mapPaymentStatus(params.paymentEntity.status),
      paidAt:
        params.paymentEntity.status === 'captured' ||
        params.paymentEntity.status === 'authorized'
          ? new Date(
              (params.paymentEntity.created_at ?? Date.now() / 1000) * 1000,
            )
          : undefined,
      providerInvoiceId: params.providerInvoiceId ?? null,
    });

    return;
  }

  const createdPayment = await createPayment({
    workspaceId: subscription.workspaceId ?? undefined,
    identityId: subscription.identityId ?? undefined,
    customerId: subscription.customerId ?? undefined,
    priceId: subscription.priceId,
    subscriptionId: subscription.id,
    type: 'RENEWAL',
    paymentProvider: 'RAZORPAY',
    providerOrderId: params.paymentEntity.order_id ?? undefined,
    providerPaymentId: params.paymentEntity.id,
    amount:
      params.paymentEntity.amount != null
        ? fromRazorpayAmountSubunits(params.paymentEntity.amount)
        : Number(price.amount),
    currency: toCurrency(params.paymentEntity.currency, price.currency),
    paymentStatus: mapPaymentStatus(params.paymentEntity.status),
    description: `${price.product.name} renewal`,
    capturedAt:
      params.paymentEntity.status === 'captured' ||
      params.paymentEntity.status === 'authorized'
        ? new Date((params.paymentEntity.created_at ?? Date.now() / 1000) * 1000)
        : null,
    metadata: toJsonInput({
      source: 'razorpay_webhook',
      providerSubscriptionId: subscription.providerSubscriptionId,
    }),
  });

  await createPaymentAttempt({
    paymentId: createdPayment.id,
    attemptNumber: 1,
    provider: 'RAZORPAY',
    status: params.paymentEntity.status ?? undefined,
    responsePayload: toJsonInput({
      payment: params.paymentEntity,
      subscription: params.subscriptionEntity,
    }),
  });

  await ensureInvoiceForWebhookPayment({
    paymentId: createdPayment.id,
    priceId: subscription.priceId,
    workspaceId: subscription.workspaceId,
    identityId: subscription.identityId,
    amount: Number(createdPayment.amount),
    currency: createdPayment.currency,
    paymentStatus: mapPaymentStatus(params.paymentEntity.status),
    paidAt:
      params.paymentEntity.status === 'captured' ||
      params.paymentEntity.status === 'authorized'
        ? new Date((params.paymentEntity.created_at ?? Date.now() / 1000) * 1000)
        : undefined,
    providerInvoiceId: params.providerInvoiceId ?? null,
  });
}

async function updateRefundFromWebhook(
  refundEntity: NonNullable<
    NonNullable<RazorpayWebhookPayload['payload']>['refund']
  >['entity'],
) {
  if (!refundEntity?.id) {
    return;
  }

  const localPayment = refundEntity.payment_id
    ? await findPaymentByProviderPaymentId(refundEntity.payment_id)
    : null;
  const existingRefund =
    (await findRefundByProviderRefundId(refundEntity.id)) ??
    (localPayment
      ? await findLatestRefundByPaymentId(localPayment.id)
      : null);

  if (!existingRefund) {
    return;
  }

  await updateRefund(existingRefund.id, {
    providerRefundId: refundEntity.id,
    status: mapRefundStatus(refundEntity.status),
    processedAt:
      refundEntity.status === 'processed'
        ? new Date((refundEntity.created_at ?? Date.now() / 1000) * 1000)
        : undefined,
    metadata: toJsonInput({
      ...(existingRefund.metadata &&
      typeof existingRefund.metadata === 'object' &&
      !Array.isArray(existingRefund.metadata)
        ? (existingRefund.metadata as Record<string, unknown>)
        : {}),
      providerStatus: refundEntity.status ?? null,
      providerAmount:
        refundEntity.amount != null
          ? fromRazorpayAmountSubunits(refundEntity.amount)
          : null,
      providerCurrency: refundEntity.currency ?? null,
      providerPaymentId: refundEntity.payment_id ?? null,
      notes: refundEntity.notes ?? null,
    }),
  });
}

export async function processRazorpayWebhookEventWorkflow(webhookEventId: string) {
  if (!webhookEventId) {
    throwError(ERR.INVALID_INPUT, 'Webhook event id is required');
  }

  let claimedEvent:
    | Awaited<ReturnType<typeof claimWebhookEventForProcessing>>
    | null = null;

  try {
    claimedEvent = await claimWebhookEventForProcessing(webhookEventId);
  } catch (error) {
    const appError = extractAppError(error);

    if (
      appError?.code === ERR.INVALID_STATE ||
      appError?.code === ERR.NOT_FOUND
    ) {
      return {
        webhookEventId,
        status: 'skipped' as const,
      };
    }

    throw error;
  }

  try {
    const event = await getWebhookEventById(claimedEvent.id);
    const payload = event.payload as RazorpayWebhookPayload;
    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const providerInvoiceId = payload.payload?.invoice?.entity?.id ?? null;
    const refundEntity = payload.payload?.refund?.entity;

    switch (event.eventType) {
      case 'payment.captured':
      case 'payment.failed':
        await updatePaymentFromWebhook(paymentEntity);
        break;
      case 'subscription.updated':
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.resumed':
      case 'subscription.halted':
      case 'subscription.cancelled':
        await updateSubscriptionFromWebhook({
          subscriptionEntity,
          paymentEntity,
          providerInvoiceId,
        });
        break;
      case 'refund.created':
      case 'refund.processed':
      case 'refund.failed':
        await updateRefundFromWebhook(refundEntity);
        break;
      default:
        break;
    }

    await markWebhookEventProcessed(event.id);

    return {
      webhookEventId: event.id,
      status: 'processed' as const,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';

    if (claimedEvent) {
      await scheduleWebhookEventRetry(
        claimedEvent.id,
        message,
        claimedEvent.attempts,
      );
    }

    throw error;
  }
}
