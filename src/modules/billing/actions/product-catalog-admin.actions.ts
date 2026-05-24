'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/modules/billing/services/catalog.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
import {
  parseCheckboxValue,
  parseNullableUuid,
  platformCatalogProductActionSchema,
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

const createProductCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const parsed = platformCatalogProductActionSchema.parse({
      name: formData.get('name'),
      code: formData.get('code'),
      planId: parseNullableUuid(formData.get('planId')),
      type: formData.get('type'),
      description: formData.get('description') ?? '',
      isActive: parseCheckboxValue(formData, 'isActive'),
    });

    const product = await createProduct({
      name: parsed.name,
      code: parsed.code,
      planId: parsed.planId ?? null,
      type: parsed.type,
      description: parsed.description || null,
      isActive: parsed.isActive,
    });

    return {
      productId: product.id,
      successMessage: `${product.name} created successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const name = String(formData.get('name') ?? '').trim();
        const code = String(formData.get('code') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.product.create',
          entityType: 'Product',
          entityId: result.productId,
          description: `Product ${name || code || result.productId} created.`,
          metadata: {
            code,
            isActive: parseCheckboxValue(formData, 'isActive'),
            planId: parseNullableUuid(formData.get('planId')) ?? null,
            type: String(formData.get('type') ?? '').trim(),
          },
        });
      },
    },
  },
);

const updateProductCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const productId = String(formData.get('productId') ?? '').trim();

    if (!productId) {
      throwError(ERR.INVALID_INPUT, 'Product ID is required');
    }

    const parsed = platformCatalogProductActionSchema.parse({
      name: formData.get('name'),
      code: formData.get('code'),
      planId: parseNullableUuid(formData.get('planId')),
      type: formData.get('type'),
      description: formData.get('description') ?? '',
      isActive: parseCheckboxValue(formData, 'isActive'),
    });

    const product = await updateProduct(productId, {
      name: parsed.name,
      code: parsed.code,
      planId: parsed.planId ?? null,
      type: parsed.type,
      description: parsed.description || null,
      isActive: parsed.isActive,
    });

    return {
      productId: product.id,
      successMessage: `${product.name} updated successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const name = String(formData.get('name') ?? '').trim();
        const code = String(formData.get('code') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.product.update',
          entityType: 'Product',
          entityId: result.productId,
          description: `Product ${name || code || result.productId} updated.`,
          metadata: {
            code,
            isActive: parseCheckboxValue(formData, 'isActive'),
            planId: parseNullableUuid(formData.get('planId')) ?? null,
            type: String(formData.get('type') ?? '').trim(),
          },
        });
      },
    },
  },
);

const toggleProductCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const productId = String(formData.get('productId') ?? '').trim();

    if (!productId) {
      throwError(ERR.INVALID_INPUT, 'Product ID is required');
    }

    const isActive = parseCheckboxValue(formData, 'isActive');
    const product = await updateProduct(productId, { isActive });

    return {
      productId: product.id,
      successMessage: `${product.name} ${
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
          action: isActive ? 'catalog.product.activate' : 'catalog.product.deactivate',
          entityType: 'Product',
          entityId: result.productId,
          description: `Product ${isActive ? 'activated' : 'deactivated'}.`,
          metadata: { isActive },
        });
      },
    },
  },
);

const deleteProductCatalogActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const productId = String(formData.get('productId') ?? '').trim();

    if (!productId) {
      throwError(ERR.INVALID_INPUT, 'Product ID is required');
    }

    await deleteProduct(productId);

    return {
      successMessage: 'Product deleted successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args }) => {
        const formData = args[0];
        const productId = String(formData.get('productId') ?? '').trim();

        return buildCatalogAuditInput({
          action: 'catalog.product.delete',
          entityType: 'Product',
          entityId: productId,
          description: 'Product deleted.',
        });
      },
    },
  },
);

export async function createProductCatalogAction(formData: FormData) {
  const response = await createProductCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function updateProductCatalogAction(formData: FormData) {
  const response = await updateProductCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function toggleProductCatalogAction(formData: FormData) {
  const response = await toggleProductCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function deleteProductCatalogAction(formData: FormData) {
  const response = await deleteProductCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}
