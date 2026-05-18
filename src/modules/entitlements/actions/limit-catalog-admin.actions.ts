'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createLimit,
  deleteLimitDefinition,
  updateLimitDefinition,
} from '@/modules/entitlements/entitlement.services';
import {
  parseCheckboxValue,
  platformCatalogLimitActionSchema,
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

const createLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const parsed = platformCatalogLimitActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    unit: formData.get('unit') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const limit = await createLimit({
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    unit: parsed.unit || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
  });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} created successfully.`,
  };
});

const updateLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  const parsed = platformCatalogLimitActionSchema.parse({
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    unit: formData.get('unit') ?? '',
    sortOrder: formData.get('sortOrder') ?? 0,
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const limit = await updateLimitDefinition(limitId, {
    key: parsed.key,
    name: parsed.name,
    description: parsed.description || null,
    unit: parsed.unit || null,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
  });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} updated successfully.`,
  };
});

const toggleLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const limit = await updateLimitDefinition(limitId, { isActive });

  return {
    limitId: limit.id,
    successMessage: `${limit.name} ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
});

const deleteLimitCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const limitId = String(formData.get('limitId') ?? '').trim();

  if (!limitId) {
    throwError(ERR.INVALID_INPUT, 'Limit ID is required');
  }

  await deleteLimitDefinition(limitId);

  return {
    successMessage: 'Limit deleted successfully.',
  };
});

export async function createLimitCatalogAction(formData: FormData) {
  return createLimitCatalogActionImpl(formData);
}

export async function updateLimitCatalogAction(formData: FormData) {
  return updateLimitCatalogActionImpl(formData);
}

export async function toggleLimitCatalogAction(formData: FormData) {
  return toggleLimitCatalogActionImpl(formData);
}

export async function deleteLimitCatalogAction(formData: FormData) {
  return deleteLimitCatalogActionImpl(formData);
}
