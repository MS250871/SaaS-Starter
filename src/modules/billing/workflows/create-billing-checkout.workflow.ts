import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  createRazorpayOrder,
  createRazorpayPlan,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  getPublicRazorpayKeyId,
  toRazorpayAmountSubunits,
  updateRazorpaySubscription,
} from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type { BillingInterval, Prisma } from '@/generated/prisma/client';
import { resolveWorkspaceSurfaceRedirect } from '@/modules/auth/workflows/post-login.workflow';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import { invalidateWorkspaceBillingCaches } from '@/modules/billing/services/billing-cache.services';
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
  findLatestSuccessfulPaymentBySubscriptionId,
  updatePayment,
} from '@/modules/billing/services/payment.services';
import {
  getWorkspaceActiveSubscriptionPlanSummary,
  createSubscription,
  updateSubscription,
} from '@/modules/billing/services/subscription.services';
import {
  calculateProratedUpgradeDelta,
  calculateUnusedSubscriptionValue,
} from '@/modules/billing/services/proration.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
import { invalidateWorkspaceEntitlementsCache } from '@/modules/entitlements/services/entitlement-cache.services';
import type {
  CreateBillingCheckoutActionInput,
  BillingCheckoutMode,
  BillingCheckoutSource,
} from '@/modules/billing/schema';
import { syncWorkspaceBillingSettings } from '@/modules/workspace/services/setting.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

type BillingCheckoutContext = {
  identityId: string;
  workspaceId?: string;
};

export type BillingCheckoutStartResult = {
  kind: 'razorpay_checkout' | 'direct_upgrade';
  mode: BillingCheckoutMode;
  paymentId: string;
  priceId: string;
  checkout?: {
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
  redirectTo?: string;
  successMessage?: string;
};

type SubscriptionUpgradeStrategy =
  | {
      kind: 'card_proration';
      providerPaymentMethod: string;
      currentSubscriptionId: string;
      currentPriceId: string;
      currentPlanKey: string | null;
      providerSubscriptionId: string;
      proratedChargeAmount: number;
      ratio: number;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    }
  | {
      kind: 'restart_with_refund';
      providerPaymentMethod: string;
      currentSubscriptionId: string;
      currentPriceId: string;
      currentPlanKey: string | null;
      providerSubscriptionId: string;
      previousSuccessfulPaymentId: string;
      previousSuccessfulProviderPaymentId: string;
      refundAmount: number;
      ratio: number;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
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

function buildWorkspaceRedirectTarget(source?: BillingCheckoutSource) {
  if (source === 'workspace-features') {
    return 'settings/features';
  }

  if (source === 'workspace-domains') {
    return 'domains';
  }

  return 'billing';
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

async function ensureProviderPlanId(priceSnapshot: PriceCheckoutSnapshot) {
  if (priceSnapshot.providerPriceId) {
    return priceSnapshot.providerPriceId;
  }

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

  await withUnitOfWork(() =>
    updatePriceProviderPriceId(priceSnapshot.id, providerPlan.id),
  );
  await invalidateCatalogCache();

  return providerPlan.id;
}

function normalizeSubscriptionPaymentMethod(value?: string | null) {
  const method = value?.toLowerCase() ?? null;

  if (
    method === 'card' ||
    method === 'upi' ||
    method === 'emandate' ||
    method === 'nach'
  ) {
    return method;
  }

  return null;
}

async function resolveUpgradeStrategy(params: {
  workspaceId?: string;
  targetPrice: PriceCheckoutSnapshot;
}) {
  if (!params.workspaceId || params.targetPrice.interval == null) {
    return null;
  }

  const activeSubscription = await withUnitOfWork(() =>
    getWorkspaceActiveSubscriptionPlanSummary(params.workspaceId!),
  );

  if (
    !activeSubscription ||
    !activeSubscription.providerSubscriptionId ||
    activeSubscription.price.interval !== params.targetPrice.interval ||
    !activeSubscription.price.product.plan?.key ||
    activeSubscription.price.product.plan.key === 'trial'
  ) {
    return null;
  }

  const currentAmount = Number(activeSubscription.price.amount);
  const nextAmount = Number(params.targetPrice.amount);

  if (nextAmount <= currentAmount) {
    return null;
  }

  const providerSubscription = await fetchRazorpaySubscription(
    activeSubscription.providerSubscriptionId,
  );
  const paymentMethod = normalizeSubscriptionPaymentMethod(
    providerSubscription.payment_method,
  );

  if (!paymentMethod) {
    return null;
  }

  const currentPeriodStart = activeSubscription.currentPeriodStart;
  const currentPeriodEnd = activeSubscription.currentPeriodEnd;

  if (paymentMethod === 'card') {
    const { proratedChargeAmount, ratio } = calculateProratedUpgradeDelta({
      currentPlanAmount: currentAmount,
      nextPlanAmount: nextAmount,
      currentPeriodStart,
      currentPeriodEnd,
    });

    return {
      kind: 'card_proration',
      providerPaymentMethod: paymentMethod,
      currentSubscriptionId: activeSubscription.id,
      currentPriceId: activeSubscription.price.id,
      currentPlanKey: activeSubscription.price.product.plan.key,
      providerSubscriptionId: activeSubscription.providerSubscriptionId,
      proratedChargeAmount,
      ratio,
      currentPeriodStart,
      currentPeriodEnd,
    } satisfies SubscriptionUpgradeStrategy;
  }

  const previousSuccessfulPayment = await withUnitOfWork(() =>
    findLatestSuccessfulPaymentBySubscriptionId(activeSubscription.id),
  );

  if (!previousSuccessfulPayment?.providerPaymentId) {
    return null;
  }

  const { unusedAmount, ratio } = calculateUnusedSubscriptionValue({
    currentPlanAmount: currentAmount,
    currentPeriodStart,
    currentPeriodEnd,
  });

  return {
    kind: 'restart_with_refund',
    providerPaymentMethod: paymentMethod,
    currentSubscriptionId: activeSubscription.id,
    currentPriceId: activeSubscription.price.id,
    currentPlanKey: activeSubscription.price.product.plan.key,
    providerSubscriptionId: activeSubscription.providerSubscriptionId,
    previousSuccessfulPaymentId: previousSuccessfulPayment.id,
    previousSuccessfulProviderPaymentId: previousSuccessfulPayment.providerPaymentId,
    refundAmount: unusedAmount,
    ratio,
    currentPeriodStart,
    currentPeriodEnd,
  } satisfies SubscriptionUpgradeStrategy;
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
  const upgradeStrategy = await resolveUpgradeStrategy({
    workspaceId: context.workspaceId,
    targetPrice: priceSnapshot,
  });

  if (upgradeStrategy?.kind === 'card_proration') {
    const providerPlanId = await ensureProviderPlanId(priceSnapshot);
    const localPayment = await withUnitOfWork(() =>
      createPayment({
        workspaceId: context.workspaceId,
        identityId: context.identityId,
        priceId: priceSnapshot.id,
        subscriptionId: upgradeStrategy.currentSubscriptionId,
        type: 'UPGRADE',
        paymentProvider: 'RAZORPAY',
        amount: upgradeStrategy.proratedChargeAmount,
        currency: priceSnapshot.currency,
        paymentStatus: 'PENDING',
        description: `${planCheckout.plan.name} prorated upgrade`,
        metadata: {
          mode: 'subscription',
          source: input.source ?? null,
          upgrade: input.upgrade ?? null,
          planKey: planCheckout.plan.key,
          planName: planCheckout.plan.name,
          upgradeMode: 'card_proration',
          providerPaymentMethod: upgradeStrategy.providerPaymentMethod,
          previousPriceId: upgradeStrategy.currentPriceId,
          previousPlanKey: upgradeStrategy.currentPlanKey,
          prorationRatio: upgradeStrategy.ratio,
          providerSubscriptionId: upgradeStrategy.providerSubscriptionId,
          periodStart: upgradeStrategy.currentPeriodStart.toISOString(),
          periodEnd: upgradeStrategy.currentPeriodEnd.toISOString(),
        },
      }),
    );

    try {
      const updatedProviderSubscription = await updateRazorpaySubscription(
        upgradeStrategy.providerSubscriptionId,
        {
          planId: providerPlanId,
          quantity: 1,
          customerNotify: true,
          scheduleChangeAt: 'now',
          notes: buildCheckoutNotes({
            localPaymentId: localPayment.id,
            localSubscriptionId: upgradeStrategy.currentSubscriptionId,
            source: input.source,
            upgrade: input.upgrade,
            planKey: planCheckout.plan.key,
            priceId: priceSnapshot.id,
          }),
        },
      );

      const nextPeriodStart =
        updatedProviderSubscription.current_start != null
          ? new Date(updatedProviderSubscription.current_start * 1000)
          : upgradeStrategy.currentPeriodStart;
      const nextPeriodEnd =
        updatedProviderSubscription.current_end != null
          ? new Date(updatedProviderSubscription.current_end * 1000)
          : upgradeStrategy.currentPeriodEnd;

      await withUnitOfWork(async () => {
        await updateSubscription(upgradeStrategy.currentSubscriptionId, {
          priceId: priceSnapshot.id,
          status:
            updatedProviderSubscription.status === 'active' ||
            updatedProviderSubscription.status === 'authenticated'
              ? 'ACTIVE'
              : 'PAST_DUE',
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          providerSubscriptionId: updatedProviderSubscription.id,
        });

        await syncWorkspaceBillingSettings({
          workspaceId: context.workspaceId!,
          planCode: planCheckout.plan.key,
          subscriptionStatus:
            updatedProviderSubscription.status === 'active' ||
            updatedProviderSubscription.status === 'authenticated'
              ? 'ACTIVE'
              : 'PAST_DUE',
        });

        await updatePayment(localPayment.id, {
          metadata: {
            mode: 'subscription',
            source: input.source ?? null,
            upgrade: input.upgrade ?? null,
            planKey: planCheckout.plan.key,
            planName: planCheckout.plan.name,
            upgradeMode: 'card_proration',
            providerPaymentMethod: upgradeStrategy.providerPaymentMethod,
            previousPriceId: upgradeStrategy.currentPriceId,
            previousPlanKey: upgradeStrategy.currentPlanKey,
            prorationRatio: upgradeStrategy.ratio,
            providerSubscriptionId: updatedProviderSubscription.id,
            periodStart: nextPeriodStart.toISOString(),
            periodEnd: nextPeriodEnd.toISOString(),
          },
        });
      });
      await invalidateWorkspaceEntitlementsCache(context.workspaceId!);
      await syncWorkspaceRoutingState(context.workspaceId!);
      await invalidateWorkspaceBillingCaches(context.workspaceId!);

      await recordPaymentAttempt({
        paymentId: localPayment.id,
        providerStatus: updatedProviderSubscription.status,
        requestPayload: {
          planId: providerPlanId,
          scheduleChangeAt: 'now',
        },
        responsePayload: updatedProviderSubscription,
      });

      const basePath = await resolveWorkspaceSurfaceRedirect({
        workspaceId: context.workspaceId!,
        fallbackPath: '/app',
      });

      return {
        kind: 'direct_upgrade',
        mode: 'subscription',
        paymentId: localPayment.id,
        priceId: priceSnapshot.id,
        summary: {
          title: planCheckout.plan.name,
          subtitle: 'Prorated upgrade charge',
          amount: upgradeStrategy.proratedChargeAmount,
          currency: priceSnapshot.currency,
          interval: priceSnapshot.interval,
        },
        redirectTo: `${basePath}/${buildWorkspaceRedirectTarget(input.source)}`,
        successMessage:
          upgradeStrategy.proratedChargeAmount > 0
            ? `Prorated upgrade applied. We are syncing the ${priceSnapshot.currency} ${upgradeStrategy.proratedChargeAmount.toFixed(2)} adjustment from Razorpay in the background.`
            : 'Plan upgrade applied. Your renewal date stays unchanged.',
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
        errorMessage:
          error instanceof Error ? error.message : 'Subscription update failed',
        responsePayload:
          error instanceof Error
            ? { message: error.message }
            : { message: 'Subscription update failed' },
      });

      throw error;
    }
  }

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
        ...(upgradeStrategy?.kind === 'restart_with_refund'
          ? {
              upgradeMode: 'restart_with_refund',
              providerPaymentMethod: upgradeStrategy.providerPaymentMethod,
              previousSubscriptionId: upgradeStrategy.currentSubscriptionId,
              previousPriceId: upgradeStrategy.currentPriceId,
              previousPlanKey: upgradeStrategy.currentPlanKey,
              previousProviderSubscriptionId:
                upgradeStrategy.providerSubscriptionId,
              previousSuccessfulPaymentId:
                upgradeStrategy.previousSuccessfulPaymentId,
              previousSuccessfulProviderPaymentId:
                upgradeStrategy.previousSuccessfulProviderPaymentId,
              refundAmount: upgradeStrategy.refundAmount,
              prorationRatio: upgradeStrategy.ratio,
              periodStart: upgradeStrategy.currentPeriodStart.toISOString(),
              periodEnd: upgradeStrategy.currentPeriodEnd.toISOString(),
            }
          : {}),
      },
    }),
  );

  try {
    const providerPlanId = await ensureProviderPlanId(priceSnapshot);

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
      kind: 'razorpay_checkout',
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
      kind: 'razorpay_checkout',
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
