import { productCrud, productQueries, priceQueries } from '@/modules/billing/db';
import type { CreateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export async function getProductById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  const product = await productQueries.byId(id);

  if (!product) {
    throwError(ERR.NOT_FOUND, 'Product not found');
  }

  return product;
}

export async function findProductByCode(code: string) {
  if (!code) {
    throwError(ERR.INVALID_INPUT, 'Product code is required');
  }

  return productQueries.findFirst({
    where: { code },
  });
}

export async function listActiveProducts() {
  return productQueries.many({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProduct(data: CreateInput<'Product'>) {
  if (!data?.code || !data?.name || !data?.type) {
    throwError(ERR.INVALID_INPUT, 'Invalid product data');
  }

  try {
    return await productCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create product', undefined, e);
  }
}

export async function getPriceById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const price = await priceQueries.byId(id);

  if (!price) {
    throwError(ERR.NOT_FOUND, 'Price not found');
  }

  return price;
}

export async function listProductPrices(productId: string) {
  if (!productId) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  return priceQueries.many({
    where: {
      productId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPriceByProductInterval(params: {
  productId: string;
  interval?: 'MONTHLY' | 'YEARLY' | null;
}) {
  if (!params.productId) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  return priceQueries.findFirst({
    where: {
      productId: params.productId,
      interval: params.interval ?? null,
      isActive: true,
    },
  });
}

export async function findActivePriceByProductCode(params: {
  productCode: string;
  interval?: 'MONTHLY' | 'YEARLY' | null;
}) {
  if (!params.productCode) {
    throwError(ERR.INVALID_INPUT, 'Product code is required');
  }

  const product = await findProductByCode(params.productCode);

  if (!product) {
    throwError(ERR.NOT_FOUND, `Product not found for code ${params.productCode}`);
  }

  const price = await findPriceByProductInterval({
    productId: product.id,
    interval: params.interval ?? null,
  });

  if (!price) {
    throwError(
      ERR.NOT_FOUND,
      `Active price not found for product ${params.productCode}`,
    );
  }

  return {
    product,
    price,
  };
}
