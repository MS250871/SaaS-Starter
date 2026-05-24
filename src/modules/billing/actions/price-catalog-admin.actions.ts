'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createPrice,
  deletePrice,
  updatePrice,
} from '@/modules/billing/services/catalog.services';
import { invalidateCatalogCache } from '@/modules/entitlements/services/catalog-cache.services';
import {
  parseCheckboxValue,
  parseNullableInterval,
  platformCatalogPriceActionSchema,
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

const createPriceCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const parsed = platformCatalogPriceActionSchema.parse({
    productId: formData.get('productId'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    interval: parseNullableInterval(formData.get('interval')),
    providerPriceId: formData.get('providerPriceId') ?? '',
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const price = await createPrice({
    productId: parsed.productId,
    amount: parsed.amount,
    currency: parsed.currency,
    interval: parsed.interval ?? null,
    providerPriceId: parsed.providerPriceId || null,
    isActive: parsed.isActive,
  });

  return {
    priceId: price.id,
    successMessage: 'Price created successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];

      return buildCatalogAuditInput({
        action: 'catalog.price.create',
        entityType: 'Price',
        entityId: result.priceId,
        description: 'Price created.',
        metadata: {
          amount: String(formData.get('amount') ?? '').trim(),
          currency: String(formData.get('currency') ?? '').trim(),
          interval: parseNullableInterval(formData.get('interval')) ?? null,
          isActive: parseCheckboxValue(formData, 'isActive'),
          productId: String(formData.get('productId') ?? '').trim(),
        },
      });
    },
  },
});

const updatePriceCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const priceId = String(formData.get('priceId') ?? '').trim();

  if (!priceId) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const parsed = platformCatalogPriceActionSchema.parse({
    productId: formData.get('productId'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    interval: parseNullableInterval(formData.get('interval')),
    providerPriceId: formData.get('providerPriceId') ?? '',
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const price = await updatePrice(priceId, {
    productId: parsed.productId,
    amount: parsed.amount,
    currency: parsed.currency,
    interval: parsed.interval ?? null,
    providerPriceId: parsed.providerPriceId || null,
    isActive: parsed.isActive,
  });

  return {
    priceId: price.id,
    successMessage: 'Price updated successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];

      return buildCatalogAuditInput({
        action: 'catalog.price.update',
        entityType: 'Price',
        entityId: result.priceId,
        description: 'Price updated.',
        metadata: {
          amount: String(formData.get('amount') ?? '').trim(),
          currency: String(formData.get('currency') ?? '').trim(),
          interval: parseNullableInterval(formData.get('interval')) ?? null,
          isActive: parseCheckboxValue(formData, 'isActive'),
          productId: String(formData.get('productId') ?? '').trim(),
        },
      });
    },
  },
});

const togglePriceCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const priceId = String(formData.get('priceId') ?? '').trim();

  if (!priceId) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const price = await updatePrice(priceId, { isActive });

  return {
    priceId: price.id,
    successMessage: `Price ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ args, result }) => {
      const formData = args[0];
      const isActive = parseCheckboxValue(formData, 'isActive');

      return buildCatalogAuditInput({
        action: isActive ? 'catalog.price.activate' : 'catalog.price.deactivate',
        entityType: 'Price',
        entityId: result.priceId,
        description: `Price ${isActive ? 'activated' : 'deactivated'}.`,
        metadata: { isActive },
      });
    },
  },
});

const deletePriceCatalogActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

  const priceId = String(formData.get('priceId') ?? '').trim();

  if (!priceId) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  await deletePrice(priceId);

  return {
    successMessage: 'Price deleted successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args }) => {
      const formData = args[0];
      const priceId = String(formData.get('priceId') ?? '').trim();

      return buildCatalogAuditInput({
        action: 'catalog.price.delete',
        entityType: 'Price',
        entityId: priceId,
        description: 'Price deleted.',
      });
    },
  },
});

export async function createPriceCatalogAction(formData: FormData) {
  const response = await createPriceCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function updatePriceCatalogAction(formData: FormData) {
  const response = await updatePriceCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function togglePriceCatalogAction(formData: FormData) {
  const response = await togglePriceCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}

export async function deletePriceCatalogAction(formData: FormData) {
  const response = await deletePriceCatalogActionImpl(formData);

  if (response.success) {
    await invalidateCatalogCache();
  }

  return response;
}
