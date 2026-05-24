function buildCacheKey(...parts: Array<string | number | null | undefined>) {
  return ['cache', ...parts]
    .filter((part): part is string | number => part !== null && part !== undefined && `${part}`.length > 0)
    .join(':');
}

export const cacheVersionKeys = {
  catalog: () => buildCacheKey('version', 'catalog'),
  permissions: () => buildCacheKey('version', 'permissions'),
  workspaceEntitlements: (workspaceId: string) =>
    buildCacheKey('version', 'workspace-entitlements', workspaceId),
} as const;

export const cacheKeys = {
  routingSlug: (slug: string) => buildCacheKey('routing', 'slug', slug.toLowerCase()),
  routingDomain: (domain: string) =>
    buildCacheKey('routing', 'domain', domain.toLowerCase()),
  workspaceSettings: (workspaceId: string) =>
    buildCacheKey('workspace', 'settings', workspaceId),
  workspaceAdminSurfaceWorkspace: (workspaceId: string) =>
    buildCacheKey('workspace', 'admin-surface-workspace', workspaceId),
  workspaceActiveSubscriptionSummary: (workspaceId: string) =>
    buildCacheKey('workspace', 'active-subscription-summary', workspaceId),
  publicPricingPlans: (catalogVersion: number) =>
    buildCacheKey('catalog', 'public-pricing-plans', `v${catalogVersion}`),
  pricingPageData: (catalogVersion: number) =>
    buildCacheKey('catalog', 'pricing-page-data-v2', `v${catalogVersion}`),
  featureCatalog: (catalogVersion: number) =>
    buildCacheKey('catalog', 'feature-catalog', `v${catalogVersion}`),
  limitCatalog: (catalogVersion: number) =>
    buildCacheKey('catalog', 'limit-catalog', `v${catalogVersion}`),
  publicOneTimeOffers: (catalogVersion: number) =>
    buildCacheKey('catalog', 'one-time-offers', `v${catalogVersion}`),
  planFeatures: (catalogVersion: number, planId: string) =>
    buildCacheKey('catalog', 'plan-features', `v${catalogVersion}`, planId),
  planLimits: (catalogVersion: number, planId: string) =>
    buildCacheKey('catalog', 'plan-limits', `v${catalogVersion}`, planId),
  workspaceFeatureOverrides: (catalogVersion: number, workspaceId: string) =>
    buildCacheKey(
      'catalog',
      'workspace-feature-overrides',
      `v${catalogVersion}`,
      workspaceId,
    ),
  workspaceLimitOverrides: (catalogVersion: number, workspaceId: string) =>
    buildCacheKey(
      'catalog',
      'workspace-limit-overrides',
      `v${catalogVersion}`,
      workspaceId,
    ),
  resolvedEntitlements: (
    catalogVersion: number,
    workspaceEntitlementsVersion: number,
    workspaceId: string,
    planId?: string | null,
  ) =>
    buildCacheKey(
      'entitlements',
      'resolved',
      `catalog-v${catalogVersion}`,
      `workspace-v${workspaceEntitlementsVersion}`,
      workspaceId,
      planId ?? 'no-plan',
    ),
  rolePermissions: (permissionsVersion: number, roleDefinitionId: string) =>
    buildCacheKey(
      'permissions',
      'role-permissions',
      `v${permissionsVersion}`,
      roleDefinitionId,
    ),
  workspaceRolePermissions: (
    permissionsVersion: number,
    workspaceId: string,
    roleDefinitionId: string,
  ) =>
    buildCacheKey(
      'permissions',
      'workspace-role-permissions',
      `v${permissionsVersion}`,
      workspaceId,
      roleDefinitionId,
    ),
  identityPermissions: (permissionsVersion: number, identityId: string) =>
    buildCacheKey(
      'permissions',
      'identity-permissions',
      `v${permissionsVersion}`,
      identityId,
    ),
  workspaceIdentityPermissions: (
    permissionsVersion: number,
    workspaceId: string,
    identityId: string,
  ) =>
    buildCacheKey(
      'permissions',
      'workspace-identity-permissions',
      `v${permissionsVersion}`,
      workspaceId,
      identityId,
    ),
} as const;

export const cacheTtls = {
  routing: 60 * 60 * 24,
  workspaceSettings: 60 * 10,
  workspaceAdminSurfaceWorkspace: 60 * 10,
  workspaceActiveSubscriptionSummary: 60 * 5,
  catalog: 60 * 10,
  entitlements: 60 * 5,
  permissions: 60 * 5,
} as const;
