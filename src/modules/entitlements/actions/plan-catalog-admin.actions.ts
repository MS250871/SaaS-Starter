'use server';

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
} from '@/modules/entitlements/entitlement.services';
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
});

export async function createPlanCatalogAction(formData: FormData) {
  return createPlanCatalogActionImpl(formData);
}

export async function updatePlanCatalogAction(formData: FormData) {
  return updatePlanCatalogActionImpl(formData);
}

export async function togglePlanCatalogAction(formData: FormData) {
  return togglePlanCatalogActionImpl(formData);
}

export async function deletePlanCatalogAction(formData: FormData) {
  return deletePlanCatalogActionImpl(formData);
}
