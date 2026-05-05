import { prisma } from '@/lib/prisma';

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
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      isPublic: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
    include: {
      features: {
        where: { isEnabled: true },
        include: {
          feature: true,
        },
      },
      limits: {
        include: {
          limitDefinition: true,
        },
      },
      products: {
        where: {
          isActive: true,
        },
        include: {
          prices: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  const featureCatalog = await prisma.feature.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: {
      key: true,
      name: true,
      category: true,
    },
  });

  const limitCatalog = await prisma.limitDefinition.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      key: true,
      name: true,
      unit: true,
    },
  });

  const pricingPlans = plans.map((plan) => {
    const prices = plan.products.flatMap((product) => product.prices);
    const monthlyPrice =
      prices.find((price) => price.interval === 'MONTHLY') ?? prices[0] ?? null;
    const yearlyPrice =
      prices.find((price) => price.interval === 'YEARLY') ?? null;

    const featuredFeatures = plan.features
      .filter(
        (planFeature) =>
          planFeature.feature &&
          featuredFeatureKeys.includes(
            planFeature.feature.key as (typeof featuredFeatureKeys)[number],
          ),
      )
      .map((planFeature) => planFeature.feature!.name);

    const featuredLimits = plan.limits
      .filter((planLimit) =>
        featuredLimitKeys.includes(
          planLimit.limitDefinition.key as (typeof featuredLimitKeys)[number],
        ),
      )
      .map((planLimit) =>
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
      featureSet: new Set(plan.features.map((planFeature) => planFeature.feature.key)),
      limitMap: new Map(
        plan.limits.map((planLimit) => [
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
    featureCatalog,
    limitCatalog,
  };
}
