'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/modules/billing/services/catalog.services';
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
);

export async function createProductCatalogAction(formData: FormData) {
  return createProductCatalogActionImpl(formData);
}

export async function updateProductCatalogAction(formData: FormData) {
  return updateProductCatalogActionImpl(formData);
}

export async function toggleProductCatalogAction(formData: FormData) {
  return toggleProductCatalogActionImpl(formData);
}

export async function deleteProductCatalogAction(formData: FormData) {
  return deleteProductCatalogActionImpl(formData);
}
