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

/* -------------------------------------------------------------------------- */
/*                                   PLAN                                     */
/* -------------------------------------------------------------------------- */

export async function getPlanById(id: string) {
  return planQueries.byId(id);
}

export async function findPlanByKey(key: string) {
  return planQueries.findFirst({ where: { key } });
}

export async function listPlans() {
  return planQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function createPlan(data: CreateInput<'Plan'>) {
  return planCrud.create(data);
}

export async function updatePlan(id: string, data: UpdateInput<'Plan'>) {
  return planCrud.update(id, data);
}

export async function deletePlan(id: string) {
  return planCrud.delete(id);
}

/* -------------------------------------------------------------------------- */
/*                                   FEATURE                                  */
/* -------------------------------------------------------------------------- */

export async function listFeatures() {
  return featureQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function createFeature(data: CreateInput<'Feature'>) {
  return featureCrud.create(data);
}

export async function updateFeature(id: string, data: UpdateInput<'Feature'>) {
  return featureCrud.update(id, data);
}

/* -------------------------------------------------------------------------- */
/*                              LIMIT DEFINITIONS                             */
/* -------------------------------------------------------------------------- */

export async function listLimits() {
  return limitDefinitionQueries.many({ orderBy: { sortOrder: 'asc' } });
}

export async function createLimit(data: CreateInput<'LimitDefinition'>) {
  return limitDefinitionCrud.create(data);
}

/* -------------------------------------------------------------------------- */
/*                           PLAN FEATURE MAPPING                             */
/* -------------------------------------------------------------------------- */

export async function setPlanFeature(params: {
  planId: string;
  featureId: string;
  isEnabled: boolean;
}) {
  return planFeatureCrud.delegate.upsert?.({
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
}

export async function listPlanFeatures(planId: string) {
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
  return planLimitCrud.delegate.upsert?.({
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
}

export async function listPlanLimits(planId: string) {
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
  return workspaceFeatureOverrideCrud.delegate.upsert?.({
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
}

export async function listWorkspaceFeatureOverrides(workspaceId: string) {
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
  return workspaceLimitOverrideCrud.delegate.upsert?.({
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
}

export async function listWorkspaceLimitOverrides(workspaceId: string) {
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
  const features = new Set<string>();
  const limits = new Map<string, number>();

  /* ---------------- PLAN ---------------- */
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

  /* ---------------- FEATURE OVERRIDES ---------------- */
  const featureOverrides = await listWorkspaceFeatureOverrides(
    params.workspaceId,
  );

  for (const fo of featureOverrides) {
    const key = fo.feature?.key;
    if (!key) continue;

    if (fo.isEnabled) features.add(key);
    else features.delete(key);
  }

  /* ---------------- LIMIT OVERRIDES ---------------- */
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
