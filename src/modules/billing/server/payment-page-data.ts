import { getAuthCookie, getUserSession } from '@/lib/auth/auth-cookies';
import { withActionTxContext } from '@/lib/request/withActionContext';
import { getPublicRazorpayKeyId } from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import {
  getPublicPlanCheckoutOptions,
  resolveOneTimeCheckoutPrice,
} from '@/modules/billing/services/catalog.services';
import {
  billingCheckoutSourceSchema,
  type BillingCheckoutSource,
} from '@/modules/billing/schema';

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatInterval(interval?: 'MONTHLY' | 'YEARLY' | null) {
  if (interval === 'YEARLY') {
    return 'yearly';
  }

  if (interval === 'MONTHLY') {
    return 'monthly';
  }

  return null;
}

function formatUpgradeLabel(value?: string) {
  if (value === 'subdomain') {
    return 'subdomain routing';
  }

  if (value === 'custom-domain') {
    return 'white-label custom domains';
  }

  return null;
}

function normalizeCheckoutSource(value?: string): BillingCheckoutSource | null {
  const parsed = billingCheckoutSourceSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return parsed.data ?? null;
}

export async function getPaymentPageData(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const [auth, session] = await Promise.all([getAuthCookie(), getUserSession()]);

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Login session missing.');
  }

  const planKey = readParam(searchParams.plan) ?? auth?.planKey ?? undefined;
  const planName = readParam(searchParams.planName) ?? auth?.planName ?? undefined;
  const priceId = readParam(searchParams.priceId);
  const productCode = readParam(searchParams.productCode);
  const requestedMode = readParam(searchParams.mode);
  const source = normalizeCheckoutSource(readParam(searchParams.source));
  const upgrade = readParam(searchParams.upgrade);

  const mode =
    requestedMode === 'one_time' || (!planKey && (priceId || productCode))
      ? 'one_time'
      : 'subscription';

  const upgradeLabel = formatUpgradeLabel(upgrade);
  const identity = await withActionTxContext(() =>
    getIdentityDisplayProfile(session.identityId),
  );

  if (
    auth?.intent === 'paid' &&
    auth.pendingPaymentId &&
    auth.pendingSubscriptionId &&
    auth.pendingPriceId &&
    !session.workspaceId
  ) {
    return {
      state: 'completed_pending_workspace' as const,
      mode: 'subscription' as const,
      title: 'Payment already verified',
      description:
        'Your subscription payment is verified. Continue to workspace creation to finish onboarding.',
      ctaLabel: 'Continue to Create Workspace',
      ctaHref: '/create-workspace',
      prefill: {
        name: `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() || null,
        email: identity.email ?? null,
        phone: identity.phone ?? null,
      },
    };
  }

  if (mode === 'subscription') {
    if (!planKey) {
      throwError(ERR.INVALID_INPUT, 'Plan key is required for subscription checkout.');
    }

    const checkout = await withActionTxContext(() =>
      getPublicPlanCheckoutOptions(planKey),
    );

    return {
      state: 'ready' as const,
      mode: 'subscription' as const,
      source,
      upgrade: upgrade ?? null,
      upgradeLabel,
      clientKey: getPublicRazorpayKeyId(),
      title: session.workspaceId
        ? `Upgrade to ${checkout.plan.name}`
        : `Activate ${checkout.plan.name}`,
      description: upgradeLabel
        ? `Complete payment to unlock ${upgradeLabel} on this workspace.`
        : session.workspaceId
          ? `Complete payment to move this workspace onto the ${checkout.plan.name} plan.`
          : `Complete payment to activate your ${checkout.plan.name} plan before workspace creation.`,
      prefill: {
        name: `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() || null,
        email: identity.email ?? null,
        phone: identity.phone ?? null,
      },
      plan: {
        key: checkout.plan.key,
        name: checkout.plan.name,
        description: checkout.plan.description,
      },
      options: checkout.options.map((option) => ({
        priceId: option.priceId,
        interval: option.interval,
        intervalLabel: formatInterval(option.interval),
        amount: option.amount,
        amountLabel: formatCurrency(option.amount, option.currency),
        currency: option.currency,
        productCode: option.productCode,
        productName: option.productName,
      })),
      selectedPriceId: priceId ?? checkout.options[0]?.priceId ?? null,
      selectedPlanName: planName ?? checkout.plan.name,
    };
  }

  const oneTimePrice = await withActionTxContext(() =>
    resolveOneTimeCheckoutPrice({
      priceId,
      productCode,
    }),
  );

  return {
    state: 'ready' as const,
    mode: 'one_time' as const,
      source,
    upgrade: upgrade ?? null,
    upgradeLabel,
    clientKey: getPublicRazorpayKeyId(),
    title: oneTimePrice.product.name,
    description:
      oneTimePrice.product.description ??
      'Complete this one-time purchase securely with Razorpay.',
    prefill: {
      name: `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() || null,
      email: identity.email ?? null,
      phone: identity.phone ?? null,
    },
    product: {
      priceId: oneTimePrice.id,
      productCode: oneTimePrice.product.code,
      name: oneTimePrice.product.name,
      description: oneTimePrice.product.description ?? '',
      amount: Number(oneTimePrice.amount),
      amountLabel: formatCurrency(Number(oneTimePrice.amount), oneTimePrice.currency),
      currency: oneTimePrice.currency,
    },
  };
}
