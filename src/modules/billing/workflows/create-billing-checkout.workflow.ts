import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  createRazorpayOrder,
  createRazorpayPlan,
  createRazorpaySubscription,
  getPublicRazorpayKeyId,
  toRazorpayAmountSubunits,
} from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type { BillingInterval, Prisma } from '@/generated/prisma/client';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import {
  type PriceCheckoutSnapshot,
  getPriceCheckoutSnapshotById,
  getPublicPlanCheckoutOptions,
  resolveOneTimeCheckoutPrice,
  updatePriceProviderPriceId,
} from '@/modules/billing/services/catalog.services';
import {
  countPaymentAttempts,
  createPayment,
  createPaymentAttempt,
  updatePayment,
} from '@/modules/billing/services/payment.services';
import {
  createSubscription,
  updateSubscription,
} from '@/modules/billing/services/subscription.services';
import type {
  CreateBillingCheckoutActionInput,
  BillingCheckoutMode,
} from '@/modules/billing/schema';

type BillingCheckoutContext = {
  identityId: string;
  workspaceId?: string;
};

export type BillingCheckoutStartResult = {
  mode: BillingCheckoutMode;
  paymentId: string;
  priceId: string;
  checkout: {
    key: string;
    name: string;
    description: string;
    amount?: number;
    currency: string;
    orderId?: string;
    subscriptionId?: string;
    prefill: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes: Record<string, string>;
  };
  summary: {
    title: string;
    subtitle: string;
    amount: number;
    currency: string;
    interval?: BillingInterval | null;
  };
};

function buildCheckoutPrefill(identity: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const name = `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim();

  return {
    name: name || undefined,
    email: identity.email ?? undefined,
    contact: identity.phone ?? undefined,
  };
}

function buildCheckoutNotes(params: {
  localPaymentId: string;
  localSubscriptionId?: string;
  source?: string;
  upgrade?: string;
  planKey?: string;
  priceId: string;
}) {
  return {
    localPaymentId: params.localPaymentId,
    ...(params.localSubscriptionId
      ? { localSubscriptionId: params.localSubscriptionId }
      : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(params.upgrade ? { upgrade: params.upgrade } : {}),
    ...(params.planKey ? { planKey: params.planKey } : {}),
    priceId: params.priceId,
  };
}

function getSubscriptionTotalCount(interval: BillingInterval | null) {
  if (interval === 'YEARLY') {
    return 100;
  }

  return 1200;
}

function getNextPeriodWindow(interval: BillingInterval | null, start = new Date()) {
  const end = new Date(start);

  if (interval === 'YEARLY') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return {
    start,
    end,
  };
}

async function recordPaymentAttempt(params: {
  paymentId: string;
  providerStatus?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}) {
  const attemptNumber = (await withUnitOfWork(() => countPaymentAttempts(params.paymentId))) + 1;

  return withUnitOfWork(() =>
    createPaymentAttempt({
      paymentId: params.paymentId,
      attemptNumber,
      provider: 'RAZORPAY',
      requestPayload: toJsonInput(params.requestPayload),
      responsePayload: toJsonInput(params.responsePayload),
      status: params.providerStatus ?? undefined,
      errorMessage: params.errorMessage ?? undefined,
    }),
  );
}

function getPaymentType(params: {
  mode: BillingCheckoutMode;
  workspaceId?: string;
  upgrade?: string;
}) {
  if (params.mode === 'subscription') {
    return params.workspaceId ? 'UPGRADE' : 'SIGNUP';
  }

  return params.upgrade ? 'ADDON' : 'ONE_TIME';
}

function toJsonInput(value: unknown) {
  if (value == null) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

async function createSubscriptionCheckout(
  context: BillingCheckoutContext,
  input: CreateBillingCheckoutActionInput,
  identity: Awaited<ReturnType<typeof getIdentityById>>,
): Promise<BillingCheckoutStartResult> {
  const planCheckout = await withUnitOfWork(() =>
    getPublicPlanCheckoutOptions(input.planKey!),
  );

  const selectedOption =
    (input.priceId
      ? planCheckout.options.find((option) => option.priceId === input.priceId)
      : null) ??
    (input.interval
      ? planCheckout.options.find((option) => option.interval === input.interval)
      : null) ??
    planCheckout.options[0] ??
    null;

  if (!selectedOption) {
    throwError(ERR.NOT_FOUND, 'No checkout price found for this plan.');
  }

  const priceSnapshot: PriceCheckoutSnapshot = await withUnitOfWork(() =>
    getPriceCheckoutSnapshotById(selectedOption.priceId),
  );
  const periodWindow = getNextPeriodWindow(priceSnapshot.interval);

  const localSubscription = await withUnitOfWork(() =>
    createSubscription({
      workspaceId: context.workspaceId,
      identityId: context.identityId,
      priceId: priceSnapshot.id,
      status: 'INCOMPLETE',
      provider: 'RAZORPAY',
      currentPeriodStart: periodWindow.start,
      currentPeriodEnd: periodWindow.end,
      cancelAtPeriodEnd: false,
    }),
  );

  const localPayment = await withUnitOfWork(() =>
    createPayment({
      workspaceId: context.workspaceId,
      identityId: context.identityId,
      priceId: priceSnapshot.id,
      subscriptionId: localSubscription.id,
      type: getPaymentType({
        mode: 'subscription',
        workspaceId: context.workspaceId,
      }),
      paymentProvider: 'RAZORPAY',
      amount: Number(priceSnapshot.amount),
      currency: priceSnapshot.currency,
      paymentStatus: 'PENDING',
      description: `${planCheckout.plan.name} subscription`,
      metadata: {
        mode: 'subscription',
        source: input.source ?? null,
        upgrade: input.upgrade ?? null,
        planKey: planCheckout.plan.key,
        planName: planCheckout.plan.name,
      },
    }),
  );

  try {
    let providerPlanId = priceSnapshot.providerPriceId;

    if (!providerPlanId) {
      const providerPlan = await createRazorpayPlan({
        name: priceSnapshot.product.name,
        description: priceSnapshot.product.description,
        amountSubunits: toRazorpayAmountSubunits(Number(priceSnapshot.amount)),
        currency: priceSnapshot.currency,
        period: priceSnapshot.interval === 'YEARLY' ? 'yearly' : 'monthly',
        interval: 1,
        notes: {
          localPriceId: priceSnapshot.id,
          planKey: priceSnapshot.product.plan?.key ?? 'unknown',
        },
      });

      providerPlanId = providerPlan.id;

      await withUnitOfWork(() =>
        updatePriceProviderPriceId(priceSnapshot.id, providerPlanId!),
      );
    }

    const providerSubscription = await createRazorpaySubscription({
      planId: providerPlanId,
      totalCount: getSubscriptionTotalCount(priceSnapshot.interval),
      quantity: 1,
      customerNotify: true,
      notes: buildCheckoutNotes({
        localPaymentId: localPayment.id,
        localSubscriptionId: localSubscription.id,
        source: input.source,
        upgrade: input.upgrade,
        planKey: planCheckout.plan.key,
        priceId: priceSnapshot.id,
      }),
    });

    await withUnitOfWork(async () => {
      await updateSubscription(localSubscription.id, {
        providerSubscriptionId: providerSubscription.id,
      });

      await updatePayment(localPayment.id, {
        metadata: {
          mode: 'subscription',
          source: input.source ?? null,
          upgrade: input.upgrade ?? null,
          planKey: planCheckout.plan.key,
          planName: planCheckout.plan.name,
          providerSubscriptionId: providerSubscription.id,
        },
      });
    });

    await recordPaymentAttempt({
      paymentId: localPayment.id,
      providerStatus: providerSubscription.status,
      requestPayload: {
        planId: providerPlanId,
        totalCount: getSubscriptionTotalCount(priceSnapshot.interval),
      },
      responsePayload: providerSubscription,
    });

    return {
      mode: 'subscription',
      paymentId: localPayment.id,
      priceId: priceSnapshot.id,
      checkout: {
        key: getPublicRazorpayKeyId(),
        name: 'SkillMaxx',
        description: `${planCheckout.plan.name} subscription`,
        currency: priceSnapshot.currency,
        subscriptionId: providerSubscription.id,
        prefill: buildCheckoutPrefill(identity),
        notes: buildCheckoutNotes({
          localPaymentId: localPayment.id,
          localSubscriptionId: localSubscription.id,
          source: input.source,
          upgrade: input.upgrade,
          planKey: planCheckout.plan.key,
          priceId: priceSnapshot.id,
        }),
      },
      summary: {
        title: planCheckout.plan.name,
        subtitle:
          priceSnapshot.interval === 'YEARLY'
            ? 'Yearly subscription'
            : 'Monthly subscription',
        amount: Number(priceSnapshot.amount),
        currency: priceSnapshot.currency,
        interval: priceSnapshot.interval,
      },
    };
  } catch (error) {
    await withUnitOfWork(() =>
      updatePayment(localPayment.id, {
        paymentStatus: 'FAILED',
      }),
    );

    await recordPaymentAttempt({
      paymentId: localPayment.id,
      providerStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Checkout creation failed',
      responsePayload:
        error instanceof Error
          ? { message: error.message }
          : { message: 'Checkout creation failed' },
    });

    throw error;
  }
}

async function createOneTimeCheckout(
  context: BillingCheckoutContext,
  input: CreateBillingCheckoutActionInput,
  identity: Awaited<ReturnType<typeof getIdentityById>>,
): Promise<BillingCheckoutStartResult> {
  const priceSnapshot: PriceCheckoutSnapshot = await withUnitOfWork(() =>
    resolveOneTimeCheckoutPrice({
      priceId: input.priceId,
      productCode: input.productCode,
    }),
  );

  const localPayment = await withUnitOfWork(() =>
    createPayment({
      workspaceId: context.workspaceId,
      identityId: context.identityId,
      priceId: priceSnapshot.id,
      type: getPaymentType({
        mode: 'one_time',
        workspaceId: context.workspaceId,
        upgrade: input.upgrade,
      }),
      paymentProvider: 'RAZORPAY',
      amount: Number(priceSnapshot.amount),
      currency: priceSnapshot.currency,
      paymentStatus: 'PENDING',
      description: `${priceSnapshot.product.name} purchase`,
      metadata: {
        mode: 'one_time',
        source: input.source ?? null,
        upgrade: input.upgrade ?? null,
        productCode: priceSnapshot.product.code,
      },
    }),
  );

  try {
    const providerOrder = await createRazorpayOrder({
      amountSubunits: toRazorpayAmountSubunits(Number(priceSnapshot.amount)),
      currency: priceSnapshot.currency,
      receipt: `pay_${localPayment.id.slice(0, 18)}`,
      notes: buildCheckoutNotes({
        localPaymentId: localPayment.id,
        source: input.source,
        upgrade: input.upgrade,
        priceId: priceSnapshot.id,
      }),
      description: `${priceSnapshot.product.name} purchase`,
    });

    await withUnitOfWork(() =>
      updatePayment(localPayment.id, {
        providerOrderId: providerOrder.id,
      }),
    );

    await recordPaymentAttempt({
      paymentId: localPayment.id,
      providerStatus: providerOrder.status,
      requestPayload: {
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        receipt: providerOrder.receipt,
      },
      responsePayload: providerOrder,
    });

    return {
      mode: 'one_time',
      paymentId: localPayment.id,
      priceId: priceSnapshot.id,
      checkout: {
        key: getPublicRazorpayKeyId(),
        name: 'SkillMaxx',
        description: `${priceSnapshot.product.name} purchase`,
        amount: Number(providerOrder.amount),
        currency: providerOrder.currency,
        orderId: providerOrder.id,
        prefill: buildCheckoutPrefill(identity),
        notes: buildCheckoutNotes({
          localPaymentId: localPayment.id,
          source: input.source,
          upgrade: input.upgrade,
          priceId: priceSnapshot.id,
        }),
      },
      summary: {
        title: priceSnapshot.product.name,
        subtitle: priceSnapshot.product.description ?? 'One-time purchase',
        amount: Number(priceSnapshot.amount),
        currency: priceSnapshot.currency,
        interval: null,
      },
    };
  } catch (error) {
    await withUnitOfWork(() =>
      updatePayment(localPayment.id, {
        paymentStatus: 'FAILED',
      }),
    );

    await recordPaymentAttempt({
      paymentId: localPayment.id,
      providerStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Checkout creation failed',
      responsePayload:
        error instanceof Error
          ? { message: error.message }
          : { message: 'Checkout creation failed' },
    });

    throw error;
  }
}

export async function createBillingCheckoutWorkflow(
  context: BillingCheckoutContext,
  input: CreateBillingCheckoutActionInput,
): Promise<BillingCheckoutStartResult> {
  const identity = await withUnitOfWork(() => getIdentityById(context.identityId));

  if (input.mode === 'subscription') {
    return createSubscriptionCheckout(context, input, identity);
  }

  return createOneTimeCheckout(context, input, identity);
}
