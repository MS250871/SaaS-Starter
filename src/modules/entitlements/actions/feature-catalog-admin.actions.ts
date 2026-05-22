'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createFeature,
  deleteFeature,
  updateFeature,
} from '@/modules/entitlements/services/entitlement.services';
import {
  parseCheckboxValue,
  platformCatalogFeatureActionSchema,
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

const createFeatureCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const parsed = platformCatalogFeatureActionSchema.parse({
      key: formData.get('key'),
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      category: formData.get('category') ?? '',
      sortOrder: formData.get('sortOrder') ?? 0,
      isActive: parseCheckboxValue(formData, 'isActive'),
    });

    const feature = await createFeature({
      key: parsed.key,
      name: parsed.name,
      description: parsed.description || null,
      category: parsed.category || null,
      sortOrder: parsed.sortOrder,
      isActive: parsed.isActive,
    });

    return {
      featureId: feature.id,
      successMessage: `${feature.name} created successfully.`,
    };
  },
);

const updateFeatureCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const featureId = String(formData.get('featureId') ?? '').trim();

    if (!featureId) {
      throwError(ERR.INVALID_INPUT, 'Feature ID is required');
    }

    const parsed = platformCatalogFeatureActionSchema.parse({
      key: formData.get('key'),
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      category: formData.get('category') ?? '',
      sortOrder: formData.get('sortOrder') ?? 0,
      isActive: parseCheckboxValue(formData, 'isActive'),
    });

    const feature = await updateFeature(featureId, {
      key: parsed.key,
      name: parsed.name,
      description: parsed.description || null,
      category: parsed.category || null,
      sortOrder: parsed.sortOrder,
      isActive: parsed.isActive,
    });

    return {
      featureId: feature.id,
      successMessage: `${feature.name} updated successfully.`,
    };
  },
);

const toggleFeatureCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const featureId = String(formData.get('featureId') ?? '').trim();

    if (!featureId) {
      throwError(ERR.INVALID_INPUT, 'Feature ID is required');
    }

    const isActive = parseCheckboxValue(formData, 'isActive');
    const feature = await updateFeature(featureId, { isActive });

    return {
      featureId: feature.id,
      successMessage: `${feature.name} ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
);

const deleteFeatureCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const featureId = String(formData.get('featureId') ?? '').trim();

    if (!featureId) {
      throwError(ERR.INVALID_INPUT, 'Feature ID is required');
    }

    await deleteFeature(featureId);

    return {
      successMessage: 'Feature deleted successfully.',
    };
  },
);

export async function createFeatureCatalogAction(formData: FormData) {
  return createFeatureCatalogActionImpl(formData);
}

export async function updateFeatureCatalogAction(formData: FormData) {
  return updateFeatureCatalogActionImpl(formData);
}

export async function toggleFeatureCatalogAction(formData: FormData) {
  return toggleFeatureCatalogActionImpl(formData);
}

export async function deleteFeatureCatalogAction(formData: FormData) {
  return deleteFeatureCatalogActionImpl(formData);
}
