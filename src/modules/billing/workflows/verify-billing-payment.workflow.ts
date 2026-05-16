import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  verifyRazorpayOrderPaymentSignature,
  verifyRazorpaySubscriptionPaymentSignature,
} from '@/lib/payments/razorpay';
import type {
  Currency,
  PaymentStatus,
  Prisma,
} from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { resolveWorkspaceSurfaceRedirect } from '@/modules/auth/workflows/post-login.workflow';
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
  createPaymentAttempt,
  getPaymentById,
  updatePayment,
} from '@/modules/billing/services/payment.services';
import {
  cancelOtherWorkspaceSubscriptions,
  getSubscriptionById,
  updateSubscription,
} from '@/modules/billing/services/subscription.services';
import type { VerifyBillingPaymentActionInput } from '@/modules/billing/schema';
import { syncWorkspaceBillingSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

type VerifyBillingPaymentContext = {
  identityId: string;
  workspaceId?: string;
};

export type VerifyBillingPaymentResult = {
  mode: VerifyBillingPaymentActionInput['mode'];
  paymentId: string;
  priceId: string;
  subscriptionId?: string;
  workspaceId?: string;
  canonicalHost?: string;
  intent?: 'free' | 'paid';
  requiresWorkspaceCreation: boolean;
  redirectTo: string;
  successMessage: string;
};

function mapRazorpayPaymentStatus(status: string) {
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

function mapRazorpaySubscriptionStatus(status: string) {
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

function buildWorkspaceRedirectTarget(source?: string) {
  if (source === 'workspace-features') {
    return 'settings/features';
  }

  if (source === 'workspace-domains') {
    return 'domains';
  }

  return 'billing';
}

function addIntervalToDate(
  start: Date,
  interval: 'MONTHLY' | 'YEARLY' | null | undefined,
) {
  const end = new Date(start);

  if (interval === 'YEARLY') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return end;
}

function toJsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function createVerificationAttempt(params: {
  paymentId: string;
  providerStatus: string;
  responsePayload: unknown;
}) {
  const attemptNumber = (await withUnitOfWork(() => countPaymentAttempts(params.paymentId))) + 1;

  return withUnitOfWork(() =>
    createPaymentAttempt({
      paymentId: params.paymentId,
      attemptNumber,
      provider: 'RAZORPAY',
      status: params.providerStatus,
      responsePayload: toJsonInput(params.responsePayload),
    }),
  );
}

async function ensureInvoiceForPayment(params: {
  paymentId: string;
  workspaceId?: string;
  identityId: string;
  amount: number;
  currency: Currency;
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  providerInvoiceId?: string | null;
  price: PriceCheckoutSnapshot;
}) {
  return withUnitOfWork(async () => {
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

    const invoice = await createInvoice({
      paymentId: params.paymentId,
      workspaceId: params.workspaceId,
      identityId: params.identityId,
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
      productId: params.price.product.id,
      priceId: params.price.id,
      quantity: 1,
      unitPrice: params.amount,
      total: params.amount,
      currency: params.currency,
      metadata: toJsonInput({
        productCode: params.price.product.code,
      }),
    });

    return invoice;
  });
}

export async function verifyBillingPaymentWorkflow(
  context: VerifyBillingPaymentContext,
  input: VerifyBillingPaymentActionInput,
): Promise<VerifyBillingPaymentResult> {
  const localPayment = await withUnitOfWork(() => getPaymentById(input.paymentId));

  if (localPayment.identityId !== context.identityId) {
    throwError(ERR.FORBIDDEN, 'This payment does not belong to the current identity.');
  }

  if (input.mode === 'subscription') {
    if (!localPayment.subscriptionId) {
      throwError(ERR.INVALID_STATE, 'Subscription payment is missing local subscription.');
    }

    const localSubscription = await withUnitOfWork(() =>
      getSubscriptionById(localPayment.subscriptionId!),
    );

    if (!localSubscription.providerSubscriptionId) {
      throwError(ERR.INVALID_STATE, 'Provider subscription reference missing.');
    }

    const isValid = verifyRazorpaySubscriptionPaymentSignature({
      subscriptionId: localSubscription.providerSubscriptionId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!isValid) {
      throwError(ERR.UNAUTHORIZED, 'Razorpay subscription signature verification failed.');
    }

    const [providerPayment, providerSubscription] = await Promise.all([
      fetchRazorpayPayment(input.razorpayPaymentId),
      fetchRazorpaySubscription(localSubscription.providerSubscriptionId),
    ]);

    const paymentStatus = mapRazorpayPaymentStatus(providerPayment.status);
    const subscriptionStatus = mapRazorpaySubscriptionStatus(
      providerSubscription.status,
    );

    const price: PriceCheckoutSnapshot = await withUnitOfWork(() =>
      getPriceCheckoutSnapshotById(localPayment.priceId!),
    );

    const periodStart =
      providerSubscription.current_start != null
        ? new Date(providerSubscription.current_start * 1000)
        : localSubscription.currentPeriodStart;
    const periodEnd =
      providerSubscription.current_end != null
        ? new Date(providerSubscription.current_end * 1000)
        : addIntervalToDate(periodStart, price.interval);

    await withUnitOfWork(async () => {
      await updatePayment(localPayment.id, {
        providerPaymentId: providerPayment.id,
        providerSignature: input.razorpaySignature,
        paymentStatus,
        capturedAt:
          providerPayment.status === 'captured' || providerPayment.status === 'authorized'
            ? new Date(providerPayment.created_at * 1000)
            : null,
        metadata: {
          ...(localPayment.metadata && typeof localPayment.metadata === 'object'
            ? (localPayment.metadata as Record<string, unknown>)
            : {}),
          providerOrderId: providerPayment.order_id ?? null,
          providerPaymentStatus: providerPayment.status,
        },
      });

      await updateSubscription(localSubscription.id, {
        status: subscriptionStatus,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        providerSubscriptionId: providerSubscription.id,
        workspaceId: context.workspaceId ?? localSubscription.workspaceId ?? undefined,
      });
    });

    await createVerificationAttempt({
      paymentId: localPayment.id,
      providerStatus: providerPayment.status,
      responsePayload: {
        payment: providerPayment,
        subscription: providerSubscription,
      },
    });

    await ensureInvoiceForPayment({
      paymentId: localPayment.id,
      workspaceId: context.workspaceId ?? localPayment.workspaceId ?? undefined,
      identityId: context.identityId,
      amount: Number(localPayment.amount),
      currency: localPayment.currency,
      paymentStatus,
      paidAt:
        providerPayment.status === 'captured' || providerPayment.status === 'authorized'
          ? new Date(providerPayment.created_at * 1000)
          : undefined,
      providerInvoiceId: providerPayment.invoice_id ?? null,
      price,
    });

    if (context.workspaceId) {
      const routing = await withUnitOfWork(async () => {
        await cancelOtherWorkspaceSubscriptions({
          workspaceId: context.workspaceId!,
          exceptSubscriptionId: localSubscription.id,
        });

        if (price.product.plan?.key) {
          await syncWorkspaceBillingSettings({
            workspaceId: context.workspaceId!,
            planCode: price.product.plan.key,
            subscriptionStatus,
          });
        }

        return syncWorkspaceRoutingState(context.workspaceId!);
      });

      const basePath = await resolveWorkspaceSurfaceRedirect({
        workspaceId: context.workspaceId,
        fallbackPath: '/app',
      });

      return {
        mode: 'subscription',
        paymentId: localPayment.id,
        priceId: price.id,
        subscriptionId: localSubscription.id,
        workspaceId: context.workspaceId,
        canonicalHost: routing?.primaryHost,
        intent: routing?.intent,
        requiresWorkspaceCreation: false,
        redirectTo: `${basePath}/${buildWorkspaceRedirectTarget(input.source)}`,
        successMessage: 'Subscription payment verified successfully.',
      };
    }

    return {
      mode: 'subscription',
      paymentId: localPayment.id,
      priceId: price.id,
      subscriptionId: localSubscription.id,
      requiresWorkspaceCreation: true,
      redirectTo: '/create-workspace',
      successMessage: 'Subscription payment verified successfully.',
    };
  }

  if (!localPayment.providerOrderId) {
    throwError(ERR.INVALID_STATE, 'Provider order reference missing.');
  }

  const isValid = verifyRazorpayOrderPaymentSignature({
    orderId: localPayment.providerOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!isValid) {
    throwError(ERR.UNAUTHORIZED, 'Razorpay payment signature verification failed.');
  }

  const providerPayment = await fetchRazorpayPayment(input.razorpayPaymentId);

  if (providerPayment.order_id && providerPayment.order_id !== localPayment.providerOrderId) {
    throwError(ERR.INVALID_STATE, 'Provider payment is linked to a different order.');
  }

  const paymentStatus = mapRazorpayPaymentStatus(providerPayment.status);
  const price: PriceCheckoutSnapshot = await withUnitOfWork(() =>
    getPriceCheckoutSnapshotById(localPayment.priceId!),
  );

  await withUnitOfWork(() =>
    updatePayment(localPayment.id, {
      providerPaymentId: providerPayment.id,
      providerSignature: input.razorpaySignature,
      paymentStatus,
      capturedAt:
        providerPayment.status === 'captured' || providerPayment.status === 'authorized'
          ? new Date(providerPayment.created_at * 1000)
          : null,
      metadata: {
        ...(localPayment.metadata && typeof localPayment.metadata === 'object'
          ? (localPayment.metadata as Record<string, unknown>)
          : {}),
        providerOrderId: providerPayment.order_id ?? null,
        providerPaymentStatus: providerPayment.status,
      },
    }),
  );

  await createVerificationAttempt({
    paymentId: localPayment.id,
    providerStatus: providerPayment.status,
    responsePayload: providerPayment,
  });

  await ensureInvoiceForPayment({
    paymentId: localPayment.id,
    workspaceId: context.workspaceId ?? localPayment.workspaceId ?? undefined,
    identityId: context.identityId,
    amount: Number(localPayment.amount),
    currency: localPayment.currency,
    paymentStatus,
    paidAt:
      providerPayment.status === 'captured' || providerPayment.status === 'authorized'
        ? new Date(providerPayment.created_at * 1000)
        : undefined,
    providerInvoiceId: providerPayment.invoice_id ?? null,
    price,
  });

  if (context.workspaceId) {
    const basePath = await resolveWorkspaceSurfaceRedirect({
      workspaceId: context.workspaceId,
      fallbackPath: '/app',
    });

    return {
      mode: 'one_time',
      paymentId: localPayment.id,
      priceId: price.id,
      workspaceId: context.workspaceId,
      requiresWorkspaceCreation: false,
      redirectTo: `${basePath}/${buildWorkspaceRedirectTarget(input.source)}`,
      successMessage: 'Payment verified successfully.',
    };
  }

  return {
    mode: 'one_time',
    paymentId: localPayment.id,
    priceId: price.id,
    requiresWorkspaceCreation: false,
    redirectTo: '/post-login',
    successMessage: 'Payment verified successfully.',
  };
}
