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
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/* -------------------------------------------------------------------------- */
/*                                   PLAN                                     */
/* -------------------------------------------------------------------------- */

export async function getPlanById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  const plan = await planQueries.byId(id);
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

/* -------------------------------------------------------------------------- */
/*                              LIMIT DEFINITIONS                             */
/* -------------------------------------------------------------------------- */

export async function listLimits() {
  return limitDefinitionQueries.many({ orderBy: { sortOrder: 'asc' } });
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

export async function listPlanFeatures(planId: string) {
  if (!planId) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  return planFeatureQueries.many({
    where: { planId },
    include: { feature: true },
  });
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

export async function listPlanLimits(planId: string) {
  if (!planId) throwError(ERR.INVALID_INPUT, 'Plan ID is required');

  return planLimitQueries.many({
    where: { planId },
    include: { limitDefinition: true },
  });
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

export async function listWorkspaceFeatureOverrides(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID is required');

  return workspaceFeatureOverrideQueries.many({
    where: { workspaceId },
    include: { feature: true },
  });
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

export async function listWorkspaceLimitOverrides(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID is required');

  return workspaceLimitOverrideQueries.many({
    where: { workspaceId },
    include: { limitDefinition: true },
  });
}

/* -------------------------------------------------------------------------- */
/*                          ENTITLEMENT RESOLVER                              */
/* -------------------------------------------------------------------------- */

export async function resolveEntitlements(params: {
  workspaceId: string;
  planId?: string | null;
}) {
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

    if (fo.isEnabled) features.add(key);
    else features.delete(key);
  }

  const limitOverrides = await listWorkspaceLimitOverrides(params.workspaceId);

  for (const lo of limitOverrides) {
    const key = lo.limitDefinition?.key;
    if (!key) continue;

    limits.set(key, lo.valueInt);
  }

  return {
    features: Array.from(features),
    limits: Object.fromEntries(limits),
  };
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
