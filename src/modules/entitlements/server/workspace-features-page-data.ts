import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  listFeatureCatalog,
  listLimitCatalog,
  listPlanFeatures,
  listPlanLimits,
  listWorkspaceFeatureOverrides,
  listWorkspaceLimitOverrides,
  resolveEntitlements,
} from '@/modules/entitlements/entitlement.services';
import { canOverrideEntitlement } from '@/modules/entitlements/override-policy';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type FeatureCategory = {
  category: string;
  features: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    baseEnabled: boolean;
    isOverridden: boolean;
  }>;
};

type LimitCategory = {
  category: string;
  limits: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    unit: string | null;
    value: number;
    baseValue: number;
    isOverridden: boolean;
  }>;
};

export async function getWorkspaceFeaturesPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        activePlan: null,
        featuresByCategory: [],
        limitsByCategory: [],
        overridesSummary: {
          featureOverrideCount: 0,
          limitOverrideCount: 0,
        },
      };
    }

    const [activeSubscription, features, limits, featureOverrides, limitOverrides] =
      await Promise.all([
        getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
        listFeatureCatalog(),
        listLimitCatalog(),
        listWorkspaceFeatureOverrides(context.workspaceId),
        listWorkspaceLimitOverrides(context.workspaceId),
      ]);

    const activePlan = activeSubscription?.price?.product?.plan ?? null;
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    });

    const basePlanFeatures = activePlan?.id
      ? await listPlanFeatures(activePlan.id)
      : [];
    const basePlanLimits = activePlan?.id
      ? await listPlanLimits(activePlan.id)
      : [];

    const baseFeatureMap = new Map<string, boolean>(
      basePlanFeatures.map((entry: (typeof basePlanFeatures)[number]) => [
        entry.featureId,
        entry.isEnabled,
      ]),
    );
    const featureOverrideMap = new Map<string, boolean>(
      featureOverrides.map((entry: (typeof featureOverrides)[number]) => [
        entry.featureId,
        entry.isEnabled,
      ]),
    );
    const baseLimitMap = new Map<string, number>(
      basePlanLimits.map((entry: (typeof basePlanLimits)[number]) => [
        entry.limitDefinitionId,
        entry.valueInt,
      ]),
    );
    const limitOverrideMap = new Map<string, number>(
      limitOverrides.map((entry: (typeof limitOverrides)[number]) => [
        entry.limitDefinitionId,
        entry.valueInt,
      ]),
    );

    const featureGroupMap: Record<string, FeatureCategory> = {};
    const featureGroups: FeatureCategory[] = Object.values(
      features.reduce(
        (
          acc: Record<string, FeatureCategory>,
          feature: (typeof features)[number],
        ) => {
          const category = feature.category ?? 'general';
          acc[category] ??= {
            category,
            features: [],
          };

          acc[category].features.push({
            id: feature.id,
            key: feature.key,
            name: feature.name,
            description: feature.description ?? null,
            enabled: entitlements.features.includes(feature.key),
            baseEnabled: baseFeatureMap.get(feature.id) ?? false,
            isOverridden:
              canOverrideEntitlement(feature.overridePolicy) &&
              featureOverrideMap.has(feature.id),
          });

          return acc;
        },
        featureGroupMap,
      ),
    );

    const limitGroupMap: Record<string, LimitCategory> = {};
    const limitGroups: LimitCategory[] = Object.values(
      limits.reduce(
        (acc: Record<string, LimitCategory>, limit: (typeof limits)[number]) => {
          const category = limit.key.startsWith('max_')
            ? limit.key.includes('api') ||
              limit.key.includes('webhook') ||
              limit.key.includes('integration')
              ? 'automation'
              : limit.key.includes('storage') ||
                  limit.key.includes('bandwidth') ||
                  limit.key.includes('email')
                ? 'infrastructure'
                : limit.key.includes('course') ||
                    limit.key.includes('chapter') ||
                    limit.key.includes('lesson') ||
                    limit.key.includes('assignment') ||
                    limit.key.includes('quiz') ||
                    limit.key.includes('certificate')
                  ? 'learning'
                  : limit.key.includes('admin') ||
                      limit.key.includes('instructor') ||
                      limit.key.includes('learner') ||
                      limit.key.includes('group') ||
                      limit.key.includes('branch')
                    ? 'people'
                    : 'general'
            : 'billing';

          acc[category] ??= {
            category,
            limits: [],
          };

          acc[category].limits.push({
            id: limit.id,
            key: limit.key,
            name: limit.name,
            description: limit.description ?? null,
            unit: limit.unit ?? null,
            value: entitlements.limits[limit.key] ?? 0,
            baseValue: baseLimitMap.get(limit.id) ?? 0,
            isOverridden:
              canOverrideEntitlement(limit.overridePolicy) &&
              limitOverrideMap.has(limit.id),
          });

          return acc;
        },
        limitGroupMap,
      ),
    );

    return {
      ...context,
      activePlan: activePlan
        ? {
            id: activePlan.id,
            key: activePlan.key,
            name: activePlan.name,
            description: activePlan.description ?? null,
            status: activeSubscription?.status ?? null,
            sortOrder: activePlan.sortOrder,
            currentPeriodEnd:
              activeSubscription?.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      featuresByCategory: featureGroups,
      limitsByCategory: limitGroups,
      overridesSummary: {
        featureOverrideCount: featureOverrides.filter((entry) =>
          canOverrideEntitlement(entry.feature.overridePolicy),
        ).length,
        limitOverrideCount: limitOverrides.filter((entry) =>
          canOverrideEntitlement(entry.limitDefinition.overridePolicy),
        ).length,
      },
    };
  });
}
