import { withActionTxContext } from '@/lib/request/withActionContext';
import { EntitlementOverridePolicy } from '@/generated/prisma/client';
import {
  getWorkspaceFeatureOverrideById,
  getWorkspaceLimitOverrideById,
  listPlanFeatures,
  listPlanLimits,
  listWorkspaceFeatureOverrideOptions,
  listWorkspaceFeatureOverrides,
  listWorkspaceLimitOverrides,
  listWorkspaceLimitOverrideOptions,
  listPlatformWorkspaceFeatureOverrideAdminSnapshots,
  listPlatformWorkspaceLimitOverrideAdminSnapshots,
  resolveEntitlements,
} from '@/modules/entitlements/services/entitlement.services';
import {
  canOverrideEntitlement,
  getOverridePolicyLabel,
} from '@/modules/entitlements/override-policy';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';
import { listPlatformWorkspaceSelectOptions } from '@/modules/workspace/services/workspace.services';
import { getPlatformWorkspaceAdminSnapshot } from '@/modules/workspace/services/workspace.services';

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export type PlatformWorkspaceFeatureOverrideRow = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  featureName: string;
  featureKey: string;
  featureCategory: string | null;
  isEnabled: boolean;
  statusLabel: string;
  createdAtLabel: string;
};

export type PlatformWorkspaceLimitOverrideRow = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceIsActive: boolean;
  limitName: string;
  limitKey: string;
  limitUnit: string | null;
  valueInt: number;
  createdAtLabel: string;
};

export type PlatformWorkspaceFeatureOverrideWorkspaceEditorData = {
  selectedWorkspaceId: string | null;
  workspace:
    | {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
      }
    | null;
  activePlan:
    | {
        id: string;
        key: string;
        name: string;
        status: string | null;
      }
    | null;
  workspaces: Awaited<ReturnType<typeof listPlatformWorkspaceSelectOptions>>;
  overrideCount: number;
  featuresByCategory: Array<{
    category: string;
    features: Array<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      isActive: boolean;
      enabled: boolean;
      baseEnabled: boolean;
      isOverridden: boolean;
      canOverride: boolean;
      overridePolicy: EntitlementOverridePolicy;
      overridePolicyLabel: string;
    }>;
  }>;
};

export type PlatformWorkspaceLimitOverrideWorkspaceEditorData = {
  selectedWorkspaceId: string | null;
  workspace:
    | {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
      }
    | null;
  activePlan:
    | {
        id: string;
        key: string;
        name: string;
        status: string | null;
      }
    | null;
  workspaces: Awaited<ReturnType<typeof listPlatformWorkspaceSelectOptions>>;
  overrideCount: number;
  limitsByCategory: Array<{
    category: string;
    limits: Array<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      unit: string | null;
      isActive: boolean;
      value: number;
      baseValue: number;
      isOverridden: boolean;
      canOverride: boolean;
      overridePolicy: EntitlementOverridePolicy;
      overridePolicyLabel: string;
    }>;
  }>;
};

function getLimitCategory(limitKey: string) {
  if (!limitKey.startsWith('max_')) {
    return 'Billing';
  }

  if (
    limitKey.includes('api') ||
    limitKey.includes('webhook') ||
    limitKey.includes('integration')
  ) {
    return 'Automation';
  }

  if (
    limitKey.includes('storage') ||
    limitKey.includes('bandwidth') ||
    limitKey.includes('email')
  ) {
    return 'Infrastructure';
  }

  if (
    limitKey.includes('course') ||
    limitKey.includes('chapter') ||
    limitKey.includes('lesson') ||
    limitKey.includes('assignment') ||
    limitKey.includes('quiz') ||
    limitKey.includes('certificate')
  ) {
    return 'Learning';
  }

  if (
    limitKey.includes('admin') ||
    limitKey.includes('instructor') ||
    limitKey.includes('learner') ||
    limitKey.includes('group') ||
    limitKey.includes('branch')
  ) {
    return 'People';
  }

  return 'General';
}

export async function getPlatformWorkspaceFeatureOverrideEditorData(
  overrideId?: string,
) {
  return withActionTxContext(async () => ({
    override: overrideId
      ? await getWorkspaceFeatureOverrideById(overrideId)
      : null,
    workspaces: await listPlatformWorkspaceSelectOptions(),
    features: await listWorkspaceFeatureOverrideOptions(),
  }));
}

export async function getPlatformWorkspaceFeatureOverrideWorkspaceEditorData(params?: {
  workspaceId?: string | null;
  overrideId?: string;
}): Promise<PlatformWorkspaceFeatureOverrideWorkspaceEditorData> {
  return withActionTxContext(async () => {
    const workspaces = await listPlatformWorkspaceSelectOptions();
    let selectedWorkspaceId = params?.workspaceId ?? null;

    if (params?.overrideId) {
      const override = await getWorkspaceFeatureOverrideById(params.overrideId);
      selectedWorkspaceId = override.workspaceId;
    }

    if (!selectedWorkspaceId) {
      return {
        selectedWorkspaceId: null,
        workspace: null,
        activePlan: null,
        workspaces,
        overrideCount: 0,
        featuresByCategory: [],
      };
    }

    const [workspace, activeSubscription, features, featureOverrides] =
      await Promise.all([
        getPlatformWorkspaceAdminSnapshot(selectedWorkspaceId),
        getWorkspaceActiveSubscriptionPlanSummary(selectedWorkspaceId),
        listWorkspaceFeatureOverrideOptions(),
        listWorkspaceFeatureOverrides(selectedWorkspaceId),
      ]);

    const activePlan = activeSubscription?.price.product.plan ?? null;
    const entitlements = await resolveEntitlements({
      workspaceId: selectedWorkspaceId,
      planId: activePlan?.id,
    });
    const basePlanFeatures = activePlan?.id
      ? await listPlanFeatures(activePlan.id)
      : [];
    const baseFeatureMap = new Map(
      basePlanFeatures.map((entry) => [entry.featureId, entry.isEnabled]),
    );
    const featureOverrideMap = new Map(
      featureOverrides.map((entry) => [entry.featureId, entry.isEnabled]),
    );
    const groups = new Map<
      string,
      PlatformWorkspaceFeatureOverrideWorkspaceEditorData['featuresByCategory'][number]
    >();

    for (const feature of features) {
      const category = feature.category ?? 'General';
      const currentGroup = groups.get(category) ?? {
        category,
        features: [],
      };

      currentGroup.features.push({
        id: feature.id,
        key: feature.key,
        name: feature.name,
        description: feature.description ?? null,
        isActive: feature.isActive,
        enabled: entitlements.features.includes(feature.key),
        baseEnabled: baseFeatureMap.get(feature.id) ?? false,
        isOverridden:
          canOverrideEntitlement(feature.overridePolicy) &&
          featureOverrideMap.has(feature.id),
        canOverride: canOverrideEntitlement(feature.overridePolicy),
        overridePolicy: feature.overridePolicy,
        overridePolicyLabel: getOverridePolicyLabel(feature.overridePolicy),
      });

      groups.set(category, currentGroup);
    }

    return {
      selectedWorkspaceId,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
      },
      activePlan: activePlan
        ? {
            id: activePlan.id,
            key: activePlan.key,
            name: activePlan.name,
            status: activeSubscription?.status ?? null,
          }
        : null,
      workspaces,
      overrideCount: featureOverrides.filter((entry) =>
        canOverrideEntitlement(entry.feature.overridePolicy),
      ).length,
      featuresByCategory: Array.from(groups.values()),
    };
  });
}

export async function getPlatformWorkspaceLimitOverrideEditorData(
  overrideId?: string,
) {
  return withActionTxContext(async () => ({
    override: overrideId ? await getWorkspaceLimitOverrideById(overrideId) : null,
    workspaces: await listPlatformWorkspaceSelectOptions(),
    limits: await listWorkspaceLimitOverrideOptions(),
  }));
}

export async function getPlatformWorkspaceLimitOverrideWorkspaceEditorData(params?: {
  workspaceId?: string | null;
  overrideId?: string;
}): Promise<PlatformWorkspaceLimitOverrideWorkspaceEditorData> {
  return withActionTxContext(async () => {
    const workspaces = await listPlatformWorkspaceSelectOptions();
    let selectedWorkspaceId = params?.workspaceId ?? null;

    if (params?.overrideId) {
      const override = await getWorkspaceLimitOverrideById(params.overrideId);
      selectedWorkspaceId = override.workspaceId;
    }

    if (!selectedWorkspaceId) {
      return {
        selectedWorkspaceId: null,
        workspace: null,
        activePlan: null,
        workspaces,
        overrideCount: 0,
        limitsByCategory: [],
      };
    }

    const [workspace, activeSubscription, limits, limitOverrides] =
      await Promise.all([
        getPlatformWorkspaceAdminSnapshot(selectedWorkspaceId),
        getWorkspaceActiveSubscriptionPlanSummary(selectedWorkspaceId),
        listWorkspaceLimitOverrideOptions(),
        listWorkspaceLimitOverrides(selectedWorkspaceId),
      ]);

    const activePlan = activeSubscription?.price.product.plan ?? null;
    const entitlements = await resolveEntitlements({
      workspaceId: selectedWorkspaceId,
      planId: activePlan?.id,
    });
    const basePlanLimits = activePlan?.id ? await listPlanLimits(activePlan.id) : [];
    const baseLimitMap = new Map(
      basePlanLimits.map((entry) => [entry.limitDefinitionId, entry.valueInt]),
    );
    const limitOverrideMap = new Map(
      limitOverrides.map((entry) => [entry.limitDefinitionId, entry.valueInt]),
    );
    const groups = new Map<
      string,
      PlatformWorkspaceLimitOverrideWorkspaceEditorData['limitsByCategory'][number]
    >();

    for (const limit of limits) {
      const category = getLimitCategory(limit.key);
      const currentGroup = groups.get(category) ?? {
        category,
        limits: [],
      };

      currentGroup.limits.push({
        id: limit.id,
        key: limit.key,
        name: limit.name,
        description: limit.description ?? null,
        unit: limit.unit ?? null,
        isActive: limit.isActive,
        value: Number(entitlements.limits[limit.key] ?? 0),
        baseValue: baseLimitMap.get(limit.id) ?? 0,
        isOverridden:
          canOverrideEntitlement(limit.overridePolicy) &&
          limitOverrideMap.has(limit.id),
        canOverride: canOverrideEntitlement(limit.overridePolicy),
        overridePolicy: limit.overridePolicy,
        overridePolicyLabel: getOverridePolicyLabel(limit.overridePolicy),
      });

      groups.set(category, currentGroup);
    }

    return {
      selectedWorkspaceId,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
      },
      activePlan: activePlan
        ? {
            id: activePlan.id,
            key: activePlan.key,
            name: activePlan.name,
            status: activeSubscription?.status ?? null,
          }
        : null,
      workspaces,
      overrideCount: limitOverrides.filter((entry) =>
        canOverrideEntitlement(entry.limitDefinition.overridePolicy),
      ).length,
      limitsByCategory: Array.from(groups.values()),
    };
  });
}

export async function getPlatformWorkspaceOverridesPageData() {
  return withActionTxContext(async () => {
    const [featureOverrides, limitOverrides] = await Promise.all([
      listPlatformWorkspaceFeatureOverrideAdminSnapshots({ limit: 500 }),
      listPlatformWorkspaceLimitOverrideAdminSnapshots({ limit: 500 }),
    ]);

    const featureRows: PlatformWorkspaceFeatureOverrideRow[] =
      featureOverrides
        .filter((override) =>
          canOverrideEntitlement(override.feature.overridePolicy),
        )
        .map((override) => ({
          id: override.id,
          workspaceId: override.workspace.id,
          workspaceName: override.workspace.name,
          workspaceSlug: override.workspace.slug,
          workspaceIsActive: override.workspace.isActive,
          featureName: override.feature.name,
          featureKey: override.feature.key,
          featureCategory: override.feature.category,
          isEnabled: override.isEnabled,
          statusLabel: override.isEnabled ? 'Enabled' : 'Disabled',
          createdAtLabel: formatDate(override.createdAt),
        }));

    const limitRows: PlatformWorkspaceLimitOverrideRow[] = limitOverrides
      .filter((override) =>
        canOverrideEntitlement(override.limitDefinition.overridePolicy),
      )
      .map((override) => ({
        id: override.id,
        workspaceId: override.workspace.id,
        workspaceName: override.workspace.name,
        workspaceSlug: override.workspace.slug,
        workspaceIsActive: override.workspace.isActive,
        limitName: override.limitDefinition.name,
        limitKey: override.limitDefinition.key,
        limitUnit: override.limitDefinition.unit,
        valueInt: override.valueInt,
        createdAtLabel: formatDate(override.createdAt),
      }));

    return {
      summary: {
        featureOverrides: featureRows.length,
        enabledFeatureOverrides: featureRows.filter((row) => row.isEnabled).length,
        limitOverrides: limitRows.length,
      },
      featureRows,
      limitRows,
    };
  });
}
