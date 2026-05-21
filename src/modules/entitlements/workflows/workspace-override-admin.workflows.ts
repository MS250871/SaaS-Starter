import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';
import {
  getFeatureById,
  deleteWorkspaceFeatureOverride,
  deleteWorkspaceLimitOverride,
  getLimitDefinitionById,
  getWorkspaceFeatureOverrideById,
  getWorkspaceLimitOverrideById,
  listPlanFeatures,
  listPlanLimits,
  listWorkspaceFeatureOverrideOptions,
  listWorkspaceFeatureOverrides,
  listWorkspaceLimitOverrideOptions,
  listWorkspaceLimitOverrides,
  setWorkspaceFeatureOverride,
  setWorkspaceLimitOverride,
} from '@/modules/entitlements/entitlement.services';
import {
  canOverrideEntitlement,
  isRoutingSensitiveFeatureKey,
  isRoutingSensitiveLimitKey,
} from '@/modules/entitlements/override-policy';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

function assertFeatureCanBeOverridden(feature: {
  name: string;
  overridePolicy: unknown;
}) {
  if (!canOverrideEntitlement(feature.overridePolicy as never)) {
    throwError(
      ERR.FORBIDDEN,
      `${feature.name} is locked to the plan and cannot be overridden.`,
    );
  }
}

function assertLimitCanBeOverridden(limit: {
  name: string;
  overridePolicy: unknown;
}) {
  if (!canOverrideEntitlement(limit.overridePolicy as never)) {
    throwError(
      ERR.FORBIDDEN,
      `${limit.name} is locked to the plan and cannot be overridden.`,
    );
  }
}

export async function saveWorkspaceFeatureOverrideWorkflow(input: {
  overrideId?: string | null;
  workspaceId: string;
  featureId: string;
  isEnabled: boolean;
}) {
  return withUnitOfWork(async () => {
    const feature = await getFeatureById(input.featureId);
    assertFeatureCanBeOverridden(feature);

    let shouldSyncRouting = isRoutingSensitiveFeatureKey(feature.key);

    if (input.overrideId) {
      const existing = await getWorkspaceFeatureOverrideById(input.overrideId);
      const hasChangedTarget =
        existing.workspaceId !== input.workspaceId ||
        existing.featureId !== input.featureId;

      shouldSyncRouting =
        shouldSyncRouting || isRoutingSensitiveFeatureKey(existing.feature.key);

      if (hasChangedTarget) {
        await deleteWorkspaceFeatureOverride(existing.id);
      }
    }

    const override = await setWorkspaceFeatureOverride({
      workspaceId: input.workspaceId,
      featureId: input.featureId,
      isEnabled: input.isEnabled,
    });

    if (shouldSyncRouting) {
      await syncWorkspaceRoutingState(input.workspaceId);
    }

    return override;
  });
}

export async function syncWorkspaceFeatureOverridesWorkflow(input: {
  workspaceId: string;
  enabledFeatureIds: string[];
}) {
  return withUnitOfWork(async () => {
    const [activeSubscription, features, existingOverrides] = await Promise.all([
      getWorkspaceActiveSubscriptionPlanSummary(input.workspaceId),
      listWorkspaceFeatureOverrideOptions(),
      listWorkspaceFeatureOverrides(input.workspaceId),
    ]);

    const activePlan = activeSubscription?.price.product.plan ?? null;
    const basePlanFeatures = activePlan?.id
      ? await listPlanFeatures(activePlan.id)
      : [];
    const baseFeatureMap = new Map(
      basePlanFeatures.map((feature) => [feature.featureId, feature.isEnabled]),
    );
    const existingOverrideMap = new Map(
      existingOverrides.map((override) => [override.featureId, override]),
    );
    const knownFeatureIds = new Set(features.map((feature) => feature.id));
    const enabledFeatureIds = new Set(
      input.enabledFeatureIds.filter((featureId) => knownFeatureIds.has(featureId)),
    );
    let shouldSyncRouting = false;

    for (const feature of features) {
      const baseEnabled = baseFeatureMap.get(feature.id) ?? false;
      const desiredEnabled = enabledFeatureIds.has(feature.id);
      const existingOverride = existingOverrideMap.get(feature.id);
      const mutationRequired =
        desiredEnabled !== baseEnabled
          ? !existingOverride || existingOverride.isEnabled !== desiredEnabled
          : Boolean(existingOverride);

      if (!canOverrideEntitlement(feature.overridePolicy)) {
        if (existingOverride) {
          await deleteWorkspaceFeatureOverride(existingOverride.id);

          if (isRoutingSensitiveFeatureKey(feature.key)) {
            shouldSyncRouting = true;
          }
        }
        continue;
      }

      if (desiredEnabled !== baseEnabled) {
        await setWorkspaceFeatureOverride({
          workspaceId: input.workspaceId,
          featureId: feature.id,
          isEnabled: desiredEnabled,
        });

        if (mutationRequired && isRoutingSensitiveFeatureKey(feature.key)) {
          shouldSyncRouting = true;
        }
        continue;
      }

      if (existingOverride) {
        await deleteWorkspaceFeatureOverride(existingOverride.id);

        if (isRoutingSensitiveFeatureKey(feature.key)) {
          shouldSyncRouting = true;
        }
      }
    }

    if (shouldSyncRouting) {
      await syncWorkspaceRoutingState(input.workspaceId);
    }

    return {
      workspaceId: input.workspaceId,
    };
  });
}

export async function saveWorkspaceLimitOverrideWorkflow(input: {
  overrideId?: string | null;
  workspaceId: string;
  limitDefinitionId: string;
  valueInt: number;
}) {
  return withUnitOfWork(async () => {
    const limitDefinition = await getLimitDefinitionById(input.limitDefinitionId);
    assertLimitCanBeOverridden(limitDefinition);

    let shouldSyncRouting = isRoutingSensitiveLimitKey(limitDefinition.key);

    if (input.overrideId) {
      const existing = await getWorkspaceLimitOverrideById(input.overrideId);
      const hasChangedTarget =
        existing.workspaceId !== input.workspaceId ||
        existing.limitDefinitionId !== input.limitDefinitionId;

      shouldSyncRouting =
        shouldSyncRouting ||
        isRoutingSensitiveLimitKey(existing.limitDefinition.key);

      if (hasChangedTarget) {
        await deleteWorkspaceLimitOverride(existing.id);
      }
    }

    const override = await setWorkspaceLimitOverride({
      workspaceId: input.workspaceId,
      limitDefinitionId: input.limitDefinitionId,
      valueInt: input.valueInt,
    });

    if (shouldSyncRouting) {
      await syncWorkspaceRoutingState(input.workspaceId);
    }

    return override;
  });
}

export async function syncWorkspaceLimitOverridesWorkflow(input: {
  workspaceId: string;
  limitValues: Array<{
    limitDefinitionId: string;
    valueInt: number;
  }>;
}) {
  return withUnitOfWork(async () => {
    const [activeSubscription, limits, existingOverrides] = await Promise.all([
      getWorkspaceActiveSubscriptionPlanSummary(input.workspaceId),
      listWorkspaceLimitOverrideOptions(),
      listWorkspaceLimitOverrides(input.workspaceId),
    ]);

    const activePlan = activeSubscription?.price.product.plan ?? null;
    const basePlanLimits = activePlan?.id ? await listPlanLimits(activePlan.id) : [];
    const baseLimitMap = new Map(
      basePlanLimits.map((limit) => [limit.limitDefinitionId, limit.valueInt]),
    );
    const existingOverrideMap = new Map(
      existingOverrides.map((override) => [override.limitDefinitionId, override]),
    );
    const knownLimitIds = new Set(limits.map((limit) => limit.id));
    const desiredValueMap = new Map<string, number>();
    let shouldSyncRouting = false;

    for (const entry of input.limitValues) {
      if (!knownLimitIds.has(entry.limitDefinitionId)) {
        continue;
      }

      desiredValueMap.set(entry.limitDefinitionId, entry.valueInt);
    }

    for (const limit of limits) {
      const baseValue = baseLimitMap.get(limit.id) ?? 0;
      const desiredValue = desiredValueMap.get(limit.id) ?? 0;
      const existingOverride = existingOverrideMap.get(limit.id);
      const mutationRequired =
        desiredValue !== baseValue
          ? !existingOverride || existingOverride.valueInt !== desiredValue
          : Boolean(existingOverride);

      if (!canOverrideEntitlement(limit.overridePolicy)) {
        if (existingOverride) {
          await deleteWorkspaceLimitOverride(existingOverride.id);

          if (isRoutingSensitiveLimitKey(limit.key)) {
            shouldSyncRouting = true;
          }
        }
        continue;
      }

      if (desiredValue !== baseValue) {
        await setWorkspaceLimitOverride({
          workspaceId: input.workspaceId,
          limitDefinitionId: limit.id,
          valueInt: desiredValue,
        });

        if (mutationRequired && isRoutingSensitiveLimitKey(limit.key)) {
          shouldSyncRouting = true;
        }
        continue;
      }

      if (existingOverride) {
        await deleteWorkspaceLimitOverride(existingOverride.id);

        if (isRoutingSensitiveLimitKey(limit.key)) {
          shouldSyncRouting = true;
        }
      }
    }

    if (shouldSyncRouting) {
      await syncWorkspaceRoutingState(input.workspaceId);
    }

    return {
      workspaceId: input.workspaceId,
    };
  });
}

export async function deleteWorkspaceFeatureOverrideWorkflow(overrideId: string) {
  return withUnitOfWork(async () => {
    const existing = await getWorkspaceFeatureOverrideById(overrideId);
    await deleteWorkspaceFeatureOverride(existing.id);

    if (isRoutingSensitiveFeatureKey(existing.feature.key)) {
      await syncWorkspaceRoutingState(existing.workspaceId);
    }
  });
}

export async function deleteWorkspaceLimitOverrideWorkflow(overrideId: string) {
  return withUnitOfWork(async () => {
    const existing = await getWorkspaceLimitOverrideById(overrideId);
    await deleteWorkspaceLimitOverride(existing.id);

    if (isRoutingSensitiveLimitKey(existing.limitDefinition.key)) {
      await syncWorkspaceRoutingState(existing.workspaceId);
    }
  });
}
