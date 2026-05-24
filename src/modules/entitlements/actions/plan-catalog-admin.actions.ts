'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createPlan,
  deletePlan,
  syncPlanFeatures,
  syncPlanLimits,
  updatePlan,
} from '@/modules/entitlements/services/entitlement.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
import {
  parseCheckboxValue,
  parsePlanLimitAssignments,
  platformCatalogPlanActionSchema,
} from '@/modules/platform/catalog.schema';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

function buildCatalogAuditInput(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'CATALOG' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

const createPlanCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const parsed = platformCatalogPlanActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
    isPublic: parseCheckboxValue(formData, 'isPublic'),
  });

  const plan = await createPlan({
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
    isPublic: parsed.isPublic,
  });

  await syncPlanFeatures({
    planId: plan.id,
    featureIds: formData.getAll('featureIds').map(String),
  });

  await syncPlanLimits({
    planId: plan.id,
    limits: parsePlanLimitAssignments(formData),
  });

  return {
    planId: plan.id,
    successMessage: `${plan.name} created successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const name = String(formData.get('name') ?? '').trim();
      const key = String(formData.get('key') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.plan.create',
        entityType: 'Plan',
        entityId: result.planId,
        description: `Plan ${name || key || result.planId} created.`,
        metadata: {
          featureCount: formData.getAll('featureIds').length,
          isActive: parseCheckboxValue(formData, 'isActive'),
          isPublic: parseCheckboxValue(formData, 'isPublic'),
          key,
          limitCount: parsePlanLimitAssignments(formData).length,
        },
      });
    },
  },
});

const updatePlanCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const planId = String(formData.get('planId') ?? '').trim();

  if (!planId) {
    throwError(ERR.INVALID_INPUT, 'Plan ID is required');
  }

  const parsed = platformCatalogPlanActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
    isPublic: parseCheckboxValue(formData, 'isPublic'),
  });

  const plan = await updatePlan(planId, {
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
    isPublic: parsed.isPublic,
  });

  await syncPlanFeatures({
    planId,
    featureIds: formData.getAll('featureIds').map(String),
  });

  await syncPlanLimits({
    planId,
    limits: parsePlanLimitAssignments(formData),
  });

  return {
    planId: plan.id,
    successMessage: `${plan.name} updated successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const name = String(formData.get('name') ?? '').trim();
      const key = String(formData.get('key') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.plan.update',
        entityType: 'Plan',
        entityId: result.planId,
        description: `Plan ${name || key || result.planId} updated.`,
        metadata: {
          featureCount: formData.getAll('featureIds').length,
          isActive: parseCheckboxValue(formData, 'isActive'),
          isPublic: parseCheckboxValue(formData, 'isPublic'),
          key,
          limitCount: parsePlanLimitAssignments(formData).length,
        },
      });
    },
  },
});

const togglePlanCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const planId = String(formData.get('planId') ?? '').trim();

  if (!planId) {
    throwError(ERR.INVALID_INPUT, 'Plan ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const plan = await updatePlan(planId, { isActive });

  return {
    planId: plan.id,
    successMessage: `${plan.name} ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const isActive = parseCheckboxValue(formData, 'isActive');

      return buildCatalogAuditInput({
        action: isActive ? 'catalog.plan.activate' : 'catalog.plan.deactivate',
        entityType: 'Plan',
        entityId: result.planId,
        description: `Plan ${isActive ? 'activated' : 'deactivated'}.`,
        metadata: { isActive },
      });
    },
  },
});

const deletePlanCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const planId = String(formData.get('planId') ?? '').trim();

  if (!planId) {
    throwError(ERR.INVALID_INPUT, 'Plan ID is required');
  }

  await deletePlan(planId);

  return {
    successMessage: 'Plan deleted successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args }) => {
      const formData = args[0];
      const planId = String(formData.get('planId') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.plan.delete',
        entityType: 'Plan',
        entityId: planId,
        description: 'Plan deleted.',
      });
    },
  },
});

export async function createPlanCatalogAction(formData: FormData) {
  const response = await createPlanCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function updatePlanCatalogAction(formData: FormData) {
  const response = await updatePlanCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function togglePlanCatalogAction(formData: FormData) {
  const response = await togglePlanCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function deletePlanCatalogAction(formData: FormData) {
  const response = await deletePlanCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}
