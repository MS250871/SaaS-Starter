import {
  planCrud,
  planQueries,
  featureCrud,
  featureQueries,
  limitDefinitionCrud,
  limitDefinitionQueries,
  planFeatureCrud,
  planFeatureQueries,
  planLimitCrud,
  planLimitQueries,
  workspaceFeatureOverrideCrud,
  workspaceFeatureOverrideQueries,
  workspaceLimitOverrideCrud,
  workspaceLimitOverrideQueries,
} from '@/modules/entitlements/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { cacheKeys } from '@/lib/cache/cache-keys';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { canOverrideEntitlement } from '@/modules/entitlements/override-policy';
import { readResolvedWorkspaceEntitlementsCache } from '@/modules/entitlements/services/entitlement-cache.services';
import { readCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';

export type PlanFeatureWithFeature = Prisma.PlanFeatureGetPayload<{
  include: { feature: true };
}>;

export type PlanLimitWithDefinition = Prisma.PlanLimitGetPayload<{
  include: { limitDefinition: true };
}>;

export type PlanCatalogSnapshot = Prisma.PlanGetPayload<{
  include: {
    features: {
      include: {
        feature: true;
      };
    };
    limits: {
      include: {
        limitDefinition: true;
      };
    };
    products: {
      include: {
        prices: true;
      };
    };
  };
}>;

export type FeatureAdminSnapshot = Prisma.FeatureGetPayload<{
  include: {
    _count: {
      select: {
        planFeatures: true;
        workspaceOverrides: true;
      };
    };
  };
}>;

export type LimitAdminSnapshot = Prisma.LimitDefinitionGetPayload<{
  include: {
    _count: {
      select: {
        planLimits: true;
        workspaceOverrides: true;
      };
    };
  };
}>;

export type WorkspaceFeatureOverrideWithFeature =
  Prisma.WorkspaceFeatureOverrideGetPayload<{
    include: { feature: true };
  }>;

export type WorkspaceLimitOverrideWithDefinition =
  Prisma.WorkspaceLimitOverrideGetPayload<{
    include: { limitDefinition: true };
  }>;

export type PlatformWorkspaceFeatureOverrideAdminSnapshot =
  Prisma.WorkspaceFeatureOverrideGetPayload<{
    select: {
      id: true;
      workspaceId: true;
      featureId: true;
      isEnabled: true;
      createdAt: true;
      workspace: {
        select: {
          id: true;
          name: true;
          slug: true;
          isActive: true;
        };
      };
      feature: {
        select: {
          id: true;
          key: true;
          name: true;
          category: true;
          overridePolicy: true;
        };
      };
    };
  }>;

export type PlatformWorkspaceLimitOverrideAdminSnapshot =
  Prisma.WorkspaceLimitOverrideGetPayload<{
    select: {
      id: true;
      workspaceId: true;
      limitDefinitionId: true;
      valueInt: true;
      createdAt: true;
      workspace: {
        select: {
          id: true;
          name: true;
          slug: true;
          isActive: true;
        };
      };
      limitDefinition: {
        select: {
          id: true;
          key: true;
          name: true;
          unit: true;
          overridePolicy: true;
        };
      };
    };
  }>;

export type WorkspaceFeatureOverrideEditorSnapshot =
  Prisma.WorkspaceFeatureOverrideGetPayload<{
    select: {
      id: true;
      workspaceId: true;
      featureId: true;
      isEnabled: true;
      workspace: {
        select: {
          id: true;
          name: true;
          slug: true;
          isActive: true;
        };
      };
      feature: {
        select: {
          id: true;
          key: true;
          name: true;
          isActive: true;
        };
      };
    };
  }>;

export type WorkspaceLimitOverrideEditorSnapshot =
  Prisma.WorkspaceLimitOverrideGetPayload<{
    select: {
      id: true;
      workspaceId: true;
      limitDefinitionId: true;
      valueInt: true;
      workspace: {
        select: {
          id: true;
          name: true;
          slug: true;
          isActive: true;
        };
      };
      limitDefinition: {
        select: {
          id: true;
          key: true;
          name: true;
          unit: true;
          isActive: true;
        };
      };
    };
  }>;

/* -------------------------------------------------------------------------- */
/*                                   PLAN                                     */
/* -------------------------------------------------------------------------- */

export async function getPlanById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  const plan = await planQueries.findUnique({
    where: { id },
  });
  if (!plan) throwError(ERR.NOT_FOUND, 'Plan not found');

  return plan;
}

export async function findPlanByKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, 'Plan key is required');

  return planQueries.findFirst({ where: { key } });
}

export async function listPlans() {
  return planQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function listPlanCatalogSnapshots(): Promise<PlanCatalogSnapshot[]> {
  const plans = await planQueries.delegate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      features: {
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
        include: {
          prices: true,
        },
      },
    },
  });

  return plans as PlanCatalogSnapshot[];
}

export async function getPlanCatalogSnapshotById(
  id: string,
): Promise<PlanCatalogSnapshot> {
  if (!id) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  const plan = await planQueries.delegate.findUnique({
    where: { id },
    include: {
      features: {
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
        include: {
          prices: true,
        },
      },
    },
  });

  if (!plan) {
    throwError(ERR.NOT_FOUND, 'Plan not found');
  }

  return plan as PlanCatalogSnapshot;
}

export async function listPublicPricingPlans() {
  return readCatalogCache(
    (catalogVersion) => cacheKeys.publicPricingPlans(catalogVersion),
    () =>
      planQueries.delegate.findMany({
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
      }),
  );
}

export async function createPlan(data: CreateInput<'Plan'>) {
  if (!data?.key) {
    throwError(ERR.INVALID_INPUT, 'Plan key is required');
  }

  const existing = await planQueries.findFirst({
    where: { key: data.key },
  });

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Plan key already exists');
  }

  try {
    return await planCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create plan', undefined, e);
  }
}

export async function updatePlan(id: string, data: UpdateInput<'Plan'>) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  try {
    return await planCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update plan', undefined, e);
  }
}

export async function deletePlan(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  try {
    return await planCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete plan', undefined, e);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   FEATURE                                  */
/* -------------------------------------------------------------------------- */

export async function listFeatures() {
  return featureQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function getFeatureById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Feature ID is required');

  const feature = await featureQueries.findUnique({
    where: { id },
  });

  if (!feature) throwError(ERR.NOT_FOUND, 'Feature not found');

  return feature;
}

export async function listFeatureAdminSnapshots(): Promise<FeatureAdminSnapshot[]> {
  const features = await featureQueries.delegate.findMany({
    orderBy: [
      { category: 'asc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
    include: {
      _count: {
        select: {
          planFeatures: true,
          workspaceOverrides: true,
        },
      },
    },
  });

  return features as FeatureAdminSnapshot[];
}

export async function listFeatureCatalog() {
  return readCatalogCache(
    (catalogVersion) => cacheKeys.featureCatalog(catalogVersion),
    () =>
      featureQueries.many({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
  );
}

export async function createFeature(data: CreateInput<'Feature'>) {
  if (!data?.key) {
    throwError(ERR.INVALID_INPUT, 'Feature key is required');
  }

  const existing = await featureQueries.findFirst({
    where: { key: data.key },
  });

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Feature key already exists');
  }

  try {
    return await featureCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create feature', undefined, e);
  }
}

export async function updateFeature(id: string, data: UpdateInput<'Feature'>) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Feature ID is required');

  try {
    return await featureCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update feature', undefined, e);
  }
}

export async function deleteFeature(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Feature ID is required');

  try {
    return await featureCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete feature', undefined, e);
  }
}

/* -------------------------------------------------------------------------- */
/*                              LIMIT DEFINITIONS                             */
/* -------------------------------------------------------------------------- */

export async function listLimits() {
  return limitDefinitionQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function getLimitDefinitionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Limit definition ID is required');

  const limitDefinition = await limitDefinitionQueries.findUnique({
    where: { id },
  });

  if (!limitDefinition) throwError(ERR.NOT_FOUND, 'Limit definition not found');

  return limitDefinition;
}

export async function listLimitAdminSnapshots(): Promise<LimitAdminSnapshot[]> {
  const limits = await limitDefinitionQueries.delegate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: {
          planLimits: true,
          workspaceOverrides: true,
        },
      },
    },
  });

  return limits as LimitAdminSnapshot[];
}

export async function listLimitCatalog() {
  return readCatalogCache(
    (catalogVersion) => cacheKeys.limitCatalog(catalogVersion),
    () =>
      limitDefinitionQueries.many({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
  );
}

export async function createLimit(data: CreateInput<'LimitDefinition'>) {
  if (!data?.key) {
    throwError(ERR.INVALID_INPUT, 'Limit key is required');
  }

  const existing = await limitDefinitionQueries.findFirst({
    where: { key: data.key },
  });

  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Limit key already exists');
  }

  try {
    return await limitDefinitionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create limit definition', undefined, e);
  }
}

export async function updateLimitDefinition(
  id: string,
  data: UpdateInput<'LimitDefinition'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Limit definition ID is required');

  try {
    return await limitDefinitionCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update limit definition', undefined, e);
  }
}

export async function deleteLimitDefinition(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Limit definition ID is required');

  try {
    return await limitDefinitionCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete limit definition', undefined, e);
  }
}

/* -------------------------------------------------------------------------- */
/*                           PLAN FEATURE MAPPING                             */
/* -------------------------------------------------------------------------- */

export async function setPlanFeature(params: {
  planId: string;
  featureId: string;
  isEnabled: boolean;
}) {
  if (!params.planId || !params.featureId) {
    throwError(ERR.INVALID_INPUT, 'planId and featureId are required');
  }

  try {
    return await planFeatureCrud.delegate.upsert?.({
      where: {
        planId_featureId: {
          planId: params.planId,
          featureId: params.featureId,
        },
      },
      create: params,
      update: {
        isEnabled: params.isEnabled,
      },
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to set plan feature', undefined, e);
  }
}

export async function listPlanFeatures(
  planId: string,
): Promise<PlanFeatureWithFeature[]> {
  if (!planId) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  const features = await readCatalogCache(
    (catalogVersion) => cacheKeys.planFeatures(catalogVersion, planId),
    () =>
      planFeatureQueries.many({
        where: { planId },
        include: { feature: true },
      }),
  );

  return features as unknown as PlanFeatureWithFeature[];
}

/* -------------------------------------------------------------------------- */
/*                              PLAN LIMIT MAPPING                            */
/* -------------------------------------------------------------------------- */

export async function setPlanLimit(params: {
  planId: string;
  limitDefinitionId: string;
  valueInt: number;
}) {
  if (!params.planId || !params.limitDefinitionId) {
    throwError(ERR.INVALID_INPUT, 'planId and limitDefinitionId are required');
  }

  if (params.valueInt < 0) {
    throwError(ERR.INVALID_STATE, 'Limit value cannot be negative');
  }

  try {
    return await planLimitCrud.delegate.upsert?.({
      where: {
        planId_limitDefinitionId: {
          planId: params.planId,
          limitDefinitionId: params.limitDefinitionId,
        },
      },
      create: params,
      update: {
        valueInt: params.valueInt,
      },
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to set plan limit', undefined, e);
  }
}

export async function listPlanLimits(
  planId: string,
): Promise<PlanLimitWithDefinition[]> {
  if (!planId) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  const limits = await readCatalogCache(
    (catalogVersion) => cacheKeys.planLimits(catalogVersion, planId),
    () =>
      planLimitQueries.many({
        where: { planId },
        include: { limitDefinition: true },
      }),
  );

  return limits as unknown as PlanLimitWithDefinition[];
}

export async function syncPlanFeatures(params: {
  planId: string;
  featureIds: string[];
}) {
  if (!params.planId) {
    throwError(ERR.INVALID_INPUT, 'planId is required');
  }

  const featureIds = Array.from(new Set(params.featureIds.filter(Boolean)));

  await planFeatureCrud.delegate.deleteMany?.({
    where: {
      planId: params.planId,
      featureId: {
        notIn: featureIds.length > 0 ? featureIds : ['00000000-0000-0000-0000-000000000000'],
      },
    },
  });

  for (const featureId of featureIds) {
    await setPlanFeature({
      planId: params.planId,
      featureId,
      isEnabled: true,
    });
  }
}

export async function syncPlanLimits(params: {
  planId: string;
  limits: Array<{
    limitDefinitionId: string;
    valueInt: number;
  }>;
}) {
  if (!params.planId) {
    throwError(ERR.INVALID_INPUT, 'planId is required');
  }

  const limits = params.limits.filter(
    (entry) => entry.limitDefinitionId && entry.valueInt >= 0,
  );
  const limitDefinitionIds = Array.from(
    new Set(limits.map((entry) => entry.limitDefinitionId)),
  );

  await planLimitCrud.delegate.deleteMany?.({
    where: {
      planId: params.planId,
      limitDefinitionId: {
        notIn:
          limitDefinitionIds.length > 0
            ? limitDefinitionIds
            : ['00000000-0000-0000-0000-000000000000'],
      },
    },
  });

  for (const limit of limits) {
    await setPlanLimit({
      planId: params.planId,
      limitDefinitionId: limit.limitDefinitionId,
      valueInt: limit.valueInt,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                      WORKSPACE FEATURE OVERRIDES                           */
/* -------------------------------------------------------------------------- */

export async function setWorkspaceFeatureOverride(params: {
  workspaceId: string;
  featureId: string;
  isEnabled: boolean;
}) {
  if (!params.workspaceId || !params.featureId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and featureId are required');
  }

  try {
    return await workspaceFeatureOverrideCrud.delegate.upsert?.({
      where: {
        workspaceId_featureId: {
          workspaceId: params.workspaceId,
          featureId: params.featureId,
        },
      },
      create: params,
      update: {
        isEnabled: params.isEnabled,
      },
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to set workspace feature override',
      undefined,
      e,
    );
  }
}

export async function listWorkspaceFeatureOverrides(
  workspaceId: string,
): Promise<WorkspaceFeatureOverrideWithFeature[]> {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID is required');

  const overrides = await readCatalogCache(
    (catalogVersion) =>
      cacheKeys.workspaceFeatureOverrides(catalogVersion, workspaceId),
    () =>
      workspaceFeatureOverrideQueries.many({
        where: { workspaceId },
        include: { feature: true },
      }),
  );

  return overrides as unknown as WorkspaceFeatureOverrideWithFeature[];
}

export async function getWorkspaceFeatureOverrideById(
  id: string,
): Promise<WorkspaceFeatureOverrideEditorSnapshot> {
  if (!id) throwError(ERR.INVALID_INPUT, 'Feature override ID is required');

  const override = await workspaceFeatureOverrideQueries.delegate.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      featureId: true,
      isEnabled: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      feature: {
        select: {
          id: true,
          key: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!override) {
    throwError(ERR.NOT_FOUND, 'Workspace feature override not found');
  }

  return override as WorkspaceFeatureOverrideEditorSnapshot;
}

export async function deleteWorkspaceFeatureOverride(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Feature override ID is required');

  try {
    return await workspaceFeatureOverrideCrud.delete(id);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to delete workspace feature override',
      undefined,
      e,
    );
  }
}

export async function listWorkspaceFeatureOverrideOptions() {
  const features = await featureQueries.delegate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      category: true,
      sortOrder: true,
      isActive: true,
      overridePolicy: true,
    },
  });

  return features;
}

/* -------------------------------------------------------------------------- */
/*                       WORKSPACE LIMIT OVERRIDES                            */
/* -------------------------------------------------------------------------- */

export async function setWorkspaceLimitOverride(params: {
  workspaceId: string;
  limitDefinitionId: string;
  valueInt: number;
}) {
  if (!params.workspaceId || !params.limitDefinitionId) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId and limitDefinitionId are required',
    );
  }

  if (params.valueInt < 0) {
    throwError(ERR.INVALID_STATE, 'Limit override cannot be negative');
  }

  try {
    return await workspaceLimitOverrideCrud.delegate.upsert?.({
      where: {
        workspaceId_limitDefinitionId: {
          workspaceId: params.workspaceId,
          limitDefinitionId: params.limitDefinitionId,
        },
      },
      create: params,
      update: {
        valueInt: params.valueInt,
      },
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to set workspace limit override',
      undefined,
      e,
    );
  }
}

export async function listWorkspaceLimitOverrides(
  workspaceId: string,
): Promise<WorkspaceLimitOverrideWithDefinition[]> {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID is required');

  const overrides = await readCatalogCache(
    (catalogVersion) =>
      cacheKeys.workspaceLimitOverrides(catalogVersion, workspaceId),
    () =>
      workspaceLimitOverrideQueries.many({
        where: { workspaceId },
        include: { limitDefinition: true },
      }),
  );

  return overrides as unknown as WorkspaceLimitOverrideWithDefinition[];
}

export async function getWorkspaceLimitOverrideById(
  id: string,
): Promise<WorkspaceLimitOverrideEditorSnapshot> {
  if (!id) throwError(ERR.INVALID_INPUT, 'Limit override ID is required');

  const override = await workspaceLimitOverrideQueries.delegate.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      limitDefinitionId: true,
      valueInt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      limitDefinition: {
        select: {
          id: true,
          key: true,
          name: true,
          unit: true,
          isActive: true,
        },
      },
    },
  });

  if (!override) {
    throwError(ERR.NOT_FOUND, 'Workspace limit override not found');
  }

  return override as WorkspaceLimitOverrideEditorSnapshot;
}

export async function deleteWorkspaceLimitOverride(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Limit override ID is required');

  try {
    return await workspaceLimitOverrideCrud.delete(id);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to delete workspace limit override',
      undefined,
      e,
    );
  }
}

export async function listWorkspaceLimitOverrideOptions() {
  const limits = await limitDefinitionQueries.delegate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      unit: true,
      isActive: true,
      overridePolicy: true,
    },
  });

  return limits;
}

export async function listPlatformWorkspaceFeatureOverrideAdminSnapshots(opts?: {
  limit?: number;
}) {
  const overrides = await workspaceFeatureOverrideQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 250,
    select: {
      id: true,
      workspaceId: true,
      featureId: true,
      isEnabled: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      feature: {
        select: {
          id: true,
          key: true,
          name: true,
          category: true,
          overridePolicy: true,
        },
      },
    },
  });

  return overrides as PlatformWorkspaceFeatureOverrideAdminSnapshot[];
}

export async function listPlatformWorkspaceLimitOverrideAdminSnapshots(opts?: {
  limit?: number;
}) {
  const overrides = await workspaceLimitOverrideQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 250,
    select: {
      id: true,
      workspaceId: true,
      limitDefinitionId: true,
      valueInt: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      limitDefinition: {
        select: {
          id: true,
          key: true,
          name: true,
          unit: true,
          overridePolicy: true,
        },
      },
    },
  });

  return overrides as PlatformWorkspaceLimitOverrideAdminSnapshot[];
}

/* -------------------------------------------------------------------------- */
/*                          ENTITLEMENT RESOLVER                              */
/* -------------------------------------------------------------------------- */

export async function resolveEntitlements(params: {
  workspaceId: string;
  planId?: string | null;
}) {
  return readResolvedWorkspaceEntitlementsCache(params, async () => {
    if (!params.workspaceId) {
      throwError(ERR.INVALID_INPUT, 'workspaceId is required');
    }

    const features = new Set<string>();
    const limits = new Map<string, number>();

    if (params.planId) {
      const planFeatures = await listPlanFeatures(params.planId);

      for (const pf of planFeatures) {
        if (pf.isEnabled && pf.feature?.key) {
          features.add(pf.feature.key);
        }
      }

      const planLimits = await listPlanLimits(params.planId);

      for (const pl of planLimits) {
        if (pl.limitDefinition?.key) {
          limits.set(pl.limitDefinition.key, pl.valueInt);
        }
      }
    }

    const featureOverrides = await listWorkspaceFeatureOverrides(
      params.workspaceId,
    );

    for (const fo of featureOverrides) {
      const key = fo.feature?.key;
      if (!key) continue;
      if (!canOverrideEntitlement(fo.feature?.overridePolicy)) continue;

      if (fo.isEnabled) features.add(key);
      else features.delete(key);
    }

    const limitOverrides = await listWorkspaceLimitOverrides(params.workspaceId);

    for (const lo of limitOverrides) {
      const key = lo.limitDefinition?.key;
      if (!key) continue;
      if (!canOverrideEntitlement(lo.limitDefinition?.overridePolicy)) continue;

      limits.set(key, lo.valueInt);
    }

    return {
      features: Array.from(features),
      limits: Object.fromEntries(limits),
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                          RUNTIME HELPERS                                   */
/* -------------------------------------------------------------------------- */

export function hasFeature(
  entitlements: { features: string[] },
  featureKey: string,
) {
  return entitlements.features.includes(featureKey);
}

export function getLimit(
  entitlements: { limits: Record<string, number> },
  limitKey: string,
) {
  return entitlements.limits[limitKey] ?? 0;
}

/* -------------------------------------------------------------------------- */
/*                          UI HELPERS                                        */
/* -------------------------------------------------------------------------- */

export function canShowFeature(
  entitlements: { features: string[] },
  featureKey: string,
) {
  return hasFeature(entitlements, featureKey);
}

export function canUseFeature(
  entitlements: { features: string[] },
  featureKey: string,
) {
  return hasFeature(entitlements, featureKey);
}

export function hasRemainingQuota(
  entitlements: { limits: Record<string, number> },
  limitKey: string,
  used: number,
) {
  const limit = getLimit(entitlements, limitKey);
  return used < limit;
}
