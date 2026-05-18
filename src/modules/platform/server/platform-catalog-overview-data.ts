import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPriceCatalogSnapshots, listProductCatalogSnapshots } from '@/modules/billing/services/catalog.services';
import { listFeatureAdminSnapshots, listLimitAdminSnapshots, listPlanCatalogSnapshots } from '@/modules/entitlements/entitlement.services';

export async function getPlatformCatalogOverviewData() {
  return withActionTxContext(async () => {
    const [plans, products, prices, features, limits] = await Promise.all([
      listPlanCatalogSnapshots(),
      listProductCatalogSnapshots(),
      listPriceCatalogSnapshots(),
      listFeatureAdminSnapshots(),
      listLimitAdminSnapshots(),
    ]);

    return [
      {
        title: 'Plans',
        href: '/platform/catalog/plans',
        description:
          'Define plan identity, visibility, entitlement bundles, and the contract each workspace purchases.',
        totalCount: plans.length,
        stats: `${plans.filter((plan) => plan.isActive).length} active - ${plans.filter((plan) => plan.isPublic).length} public`,
      },
      {
        title: 'Products',
        href: '/platform/catalog/products',
        description:
          'Manage commercial offerings linked to plans, including subscription and one-time product records.',
        totalCount: products.length,
        stats: `${products.filter((product) => product.isActive).length} active - ${products.filter((product) => product.planId).length} linked to plans`,
      },
      {
        title: 'Prices',
        href: '/platform/catalog/prices',
        description:
          'Set billable amounts, interval variants, and provider references for each product.',
        totalCount: prices.length,
        stats: `${prices.filter((price) => price.isActive).length} active - ${prices.filter((price) => price.interval !== null).length} recurring`,
      },
      {
        title: 'Features',
        href: '/platform/catalog/features',
        description:
          'Control reusable feature flags that plans and workspace overrides can attach.',
        totalCount: features.length,
        stats: `${features.filter((feature) => feature.isActive).length} active - ${features.filter((feature) => feature._count.planFeatures > 0).length} used in plans`,
      },
      {
        title: 'Limits',
        href: '/platform/catalog/limits',
        description:
          'Define numeric quotas like seats, credits, projects, or storage for plan governance.',
        totalCount: limits.length,
        stats: `${limits.filter((limit) => limit.isActive).length} active - ${limits.filter((limit) => limit._count.planLimits > 0).length} used in plans`,
      },
    ];
  });
}
