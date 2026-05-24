'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createFeature,
  deleteFeature,
  updateFeature,
} from '@/modules/entitlements/services/entitlement.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
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
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const name = String(formData.get('name') ?? '').trim();
        const key = String(formData.get('key') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.feature.create',
          entityType: 'Feature',
          entityId: result.featureId,
          description: `Feature ${name || key || result.featureId} created.`,
          metadata: {
            category: String(formData.get('category') ?? '').trim() || null,
            isActive: parseCheckboxValue(formData, 'isActive'),
            key,
          },
        });
      },
    },
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
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const name = String(formData.get('name') ?? '').trim();
        const key = String(formData.get('key') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.feature.update',
          entityType: 'Feature',
          entityId: result.featureId,
          description: `Feature ${name || key || result.featureId} updated.`,
          metadata: {
            category: String(formData.get('category') ?? '').trim() || null,
            isActive: parseCheckboxValue(formData, 'isActive'),
            key,
          },
        });
      },
    },
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
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const isActive = parseCheckboxValue(formData, 'isActive');

        return buildCatalogAuditInput({
          action: isActive ? 'catalog.feature.activate' : 'catalog.feature.deactivate',
          entityType: 'Feature',
          entityId: result.featureId,
          description: `Feature ${isActive ? 'activated' : 'deactivated'}.`,
          metadata: { isActive },
        });
      },
    },
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
  {
    audit: {
      onSuccess: ({ args }) => {
        const formData = args[0];
        const featureId = String(formData.get('featureId') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.feature.delete',
          entityType: 'Feature',
          entityId: featureId,
          description: 'Feature deleted.',
        });
      },
    },
  },
);

export async function createFeatureCatalogAction(formData: FormData) {
  const response = await createFeatureCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function updateFeatureCatalogAction(formData: FormData) {
  const response = await updateFeatureCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function toggleFeatureCatalogAction(formData: FormData) {
  const response = await toggleFeatureCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function deleteFeatureCatalogAction(formData: FormData) {
  const response = await deleteFeatureCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}
