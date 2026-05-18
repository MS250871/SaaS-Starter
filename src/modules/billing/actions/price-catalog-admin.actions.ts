'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  createPrice,
  deletePrice,
  updatePrice,
} from '@/modules/billing/services/catalog.services';
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
});

export async function createPriceCatalogAction(formData: FormData) {
  return createPriceCatalogActionImpl(formData);
}

export async function updatePriceCatalogAction(formData: FormData) {
  return updatePriceCatalogActionImpl(formData);
}

export async function togglePriceCatalogAction(formData: FormData) {
  return togglePriceCatalogActionImpl(formData);
}

export async function deletePriceCatalogAction(formData: FormData) {
  return deletePriceCatalogActionImpl(formData);
}
