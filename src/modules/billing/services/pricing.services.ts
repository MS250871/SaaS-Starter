import {
  listFeatureCatalog,
  listLimitCatalog,
  listPublicPricingPlans,
} from '@/modules/entitlements/entitlement.services';

type PublicPricingPlan = Awaited<ReturnType<typeof listPublicPricingPlans>>[number];
type PricingFeatureCatalogItem = Awaited<ReturnType<typeof listFeatureCatalog>>[number];
type PricingLimitCatalogItem = Awaited<ReturnType<typeof listLimitCatalog>>[number];

export type PricingPagePlan = {
  key: string;
  name: string;
  description: string;
  price: string;
  priceHint?: string;
  features: string[];
  button: string;
  link: string;
  highlight: boolean;
  featureSet: Set<string>;
  limitMap: Map<string, { value: number; unit: string | null }>;
};

const featuredFeatureKeys = [
  'domain_path_based',
  'domain_subdomain',
  'domain_custom',
  'branding_remove_platform_branding',
  'paid_courses',
  'advanced_analytics',
  'priority_support',
] as const;

const featuredLimitKeys = [
  'trial_days',
  'max_admin_users',
  'max_learners',
  'max_courses',
  'max_custom_domains',
  'max_subdomains',
  'max_api_requests_per_month',
] as const;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatInterval(interval: 'MONTHLY' | 'YEARLY' | null | undefined) {
  if (interval === 'MONTHLY') return '/month';
  if (interval === 'YEARLY') return '/year';
  return '';
}

function formatLimitValue(value: number, unit?: string | null) {
  if (value === 0) {
    return 'Not included';
  }

  if (unit) {
    return `${value.toLocaleString('en-IN')} ${unit}`;
  }

  return value.toLocaleString('en-IN');
}

function planButtonConfig(planKey: string) {
  if (planKey === 'trial') {
    return {
      button: 'Start Free Trial',
      highlight: false,
    };
  }

  if (planKey === 'pro') {
    return {
      button: 'Start Pro',
      highlight: true,
    };
  }

  return {
    button: 'Start Business',
    highlight: false,
  };
}

export async function getPricingPageData() {
  const [plans, featureCatalog, limitCatalog] = await Promise.all([
    listPublicPricingPlans(),
    listFeatureCatalog(),
    listLimitCatalog(),
  ]);

  const pricingPlans: PricingPagePlan[] = plans.map((plan: PublicPricingPlan) => {
    const prices = plan.products.flatMap((product: PublicPricingPlan['products'][number]) => product.prices);
    const monthlyPrice =
      prices.find((price: (typeof prices)[number]) => price.interval === 'MONTHLY') ??
      prices[0] ??
      null;
    const yearlyPrice =
      prices.find((price: (typeof prices)[number]) => price.interval === 'YEARLY') ??
      null;

    const featuredFeatures = plan.features
      .filter((planFeature: PublicPricingPlan['features'][number]) =>
        planFeature.feature &&
        featuredFeatureKeys.includes(
          planFeature.feature.key as (typeof featuredFeatureKeys)[number],
        ),
      )
      .map(
        (planFeature: PublicPricingPlan['features'][number]) =>
          planFeature.feature!.name,
      );

    const featuredLimits = plan.limits
      .filter((planLimit: PublicPricingPlan['limits'][number]) =>
        featuredLimitKeys.includes(
          planLimit.limitDefinition.key as (typeof featuredLimitKeys)[number],
        ),
      )
      .map((planLimit: PublicPricingPlan['limits'][number]) =>
        `${planLimit.limitDefinition.name}: ${formatLimitValue(
          planLimit.valueInt,
          planLimit.limitDefinition.unit,
        )}`,
      );

    const topPoints = [...featuredFeatures, ...featuredLimits].slice(0, 6);
    const buttonConfig = planButtonConfig(plan.key);
    const signupParams = new URLSearchParams({
      intent: plan.key === 'trial' ? 'free' : 'paid',
      plan: plan.key,
      planName: plan.name,
    });

    return {
      key: plan.key,
      name: plan.name,
      description: plan.description ?? '',
      price: monthlyPrice
        ? `${formatCurrency(Number(monthlyPrice.amount), monthlyPrice.currency)}${formatInterval(monthlyPrice.interval)}`
        : 'Custom',
      priceHint: yearlyPrice
        ? `or ${formatCurrency(Number(yearlyPrice.amount), yearlyPrice.currency)}${formatInterval(yearlyPrice.interval)}`
        : plan.key === 'trial'
          ? 'Includes a 15-day LMS trial'
          : undefined,
      features: topPoints,
      button: buttonConfig.button,
      link: `/signup?${signupParams.toString()}`,
      highlight: buttonConfig.highlight,
      featureSet: new Set(
        plan.features.map(
          (planFeature: PublicPricingPlan['features'][number]) =>
            planFeature.feature.key,
        ),
      ),
      limitMap: new Map(
        plan.limits.map((planLimit: PublicPricingPlan['limits'][number]) => [
          planLimit.limitDefinition.key,
          {
            value: planLimit.valueInt,
            unit: planLimit.limitDefinition.unit,
          },
        ]),
      ),
    };
  });

  return {
    plans: pricingPlans,
    featureCatalog: featureCatalog as PricingFeatureCatalogItem[],
    limitCatalog: limitCatalog as PricingLimitCatalogItem[],
  };
}
