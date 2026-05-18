import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getFeatureById,
  getLimitDefinitionById,
  getPlanCatalogSnapshotById,
  listFeatureAdminSnapshots,
  listFeatures,
  listLimitAdminSnapshots,
  listLimits,
  listPlanCatalogSnapshots,
} from '@/modules/entitlements/entitlement.services';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Calcutta',
  }).format(date);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getRecurringPriceLabel(
  products: Array<{
    isActive: boolean;
    prices: Array<{
      isActive: boolean;
      interval: 'MONTHLY' | 'YEARLY' | null;
      amount: number | bigint;
      currency: string;
    }>;
  }>,
  interval: 'MONTHLY' | 'YEARLY',
) {
  const prices = products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      product.prices.filter(
        (price) => price.isActive && price.interval === interval,
      ),
    )
    .sort((left, right) => Number(left.amount) - Number(right.amount));

  const price = prices[0] ?? null;

  if (!price) {
    return null;
  }

  return formatCurrency(Number(price.amount), price.currency);
}

export async function getPlatformPlansListData() {
  return withActionTxContext(async () => {
    const plans = await listPlanCatalogSnapshots();

    return plans.map((plan) => ({
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description ?? '',
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      sortOrder: plan.sortOrder,
      featureCount: plan.features.filter((entry) => entry.isEnabled).length,
      limitCount: plan.limits.length,
      productCount: plan.products.length,
      monthlyPrice: getRecurringPriceLabel(plan.products, 'MONTHLY'),
      yearlyPrice: getRecurringPriceLabel(plan.products, 'YEARLY'),
      updatedAtLabel: formatDate(plan.updatedAt),
    }));
  });
}

export async function getPlatformFeaturesListData() {
  return withActionTxContext(async () => {
    const features = await listFeatureAdminSnapshots();

    return features.map((feature) => ({
      id: feature.id,
      key: feature.key,
      name: feature.name,
      description: feature.description ?? '',
      category: feature.category ?? 'General',
      sortOrder: feature.sortOrder,
      isActive: feature.isActive,
      planCount: feature._count.planFeatures,
      overrideCount: feature._count.workspaceOverrides,
      updatedAtLabel: formatDate(feature.updatedAt),
    }));
  });
}

export async function getPlatformLimitsListData() {
  return withActionTxContext(async () => {
    const limits = await listLimitAdminSnapshots();

    return limits.map((limit) => ({
      id: limit.id,
      key: limit.key,
      name: limit.name,
      description: limit.description ?? '',
      unit: limit.unit ?? '',
      sortOrder: limit.sortOrder,
      isActive: limit.isActive,
      planCount: limit._count.planLimits,
      overrideCount: limit._count.workspaceOverrides,
      updatedAtLabel: formatDate(limit.updatedAt),
    }));
  });
}

export async function getPlatformPlanEditorData(planId?: string) {
  return withActionTxContext(async () => ({
    plan: planId ? await getPlanCatalogSnapshotById(planId) : null,
    features: await listFeatures(),
    limits: await listLimits(),
  }));
}

export async function getPlatformFeatureEditorData(featureId?: string) {
  return withActionTxContext(async () => ({
    feature: featureId ? await getFeatureById(featureId) : null,
  }));
}

export async function getPlatformLimitEditorData(limitId?: string) {
  return withActionTxContext(async () => ({
    limit: limitId ? await getLimitDefinitionById(limitId) : null,
  }));
}
