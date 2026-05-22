import {
  productCrud,
  productQueries,
  priceCrud,
  priceQueries,
} from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { listPublicPricingPlans } from '@/modules/entitlements/services/entitlement.services';
import {
  BillingInterval,
  Currency,
  Prisma,
  ProductType,
} from '@/generated/prisma/client';

export type PriceCheckoutSnapshot = Prisma.PriceGetPayload<{
  select: {
    id: true;
    amount: true;
    currency: true;
    interval: true;
    providerPriceId: true;
    product: {
      select: {
        id: true;
        code: true;
        name: true;
        type: true;
        description: true;
        plan: {
          select: {
            id: true;
            key: true;
            name: true;
          };
        };
      };
    };
  };
}>;

export type ProductCatalogSnapshot = Prisma.ProductGetPayload<{
  include: {
    plan: true;
    prices: true;
  };
}>;

export type PriceCatalogSnapshot = Prisma.PriceGetPayload<{
  include: {
    product: {
      include: {
        plan: true;
      };
    };
  };
}>;

export type OneTimePurchaseOffer = {
  priceId: string;
  productCode: string;
  name: string;
  description: string;
  amount: number;
  currency: Currency;
};

export async function getProductById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  const product = await productQueries.findUnique({
    where: { id },
  });

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

export async function listProductCatalogSnapshots(): Promise<
  ProductCatalogSnapshot[]
> {
  const products = await productQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: {
      plan: true,
      prices: true,
    },
  });

  return products as ProductCatalogSnapshot[];
}

export async function getProductCatalogSnapshotById(
  id: string,
): Promise<ProductCatalogSnapshot> {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  const product = await productQueries.delegate.findUnique({
    where: { id },
    include: {
      plan: true,
      prices: true,
    },
  });

  if (!product) {
    throwError(ERR.NOT_FOUND, 'Product not found');
  }

  return product as ProductCatalogSnapshot;
}

export async function findActiveProductByCode(code: string) {
  if (!code) {
    throwError(ERR.INVALID_INPUT, 'Product code is required');
  }

  return productQueries.findFirst({
    where: {
      code,
      isActive: true,
    },
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

export async function updateProduct(id: string, data: UpdateInput<'Product'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  try {
    return await productCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update product', undefined, e);
  }
}

export async function deleteProduct(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  try {
    return await productCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete product', undefined, e);
  }
}

export async function getPriceById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const price = await priceQueries.findUnique({
    where: { id },
  });

  if (!price) {
    throwError(ERR.NOT_FOUND, 'Price not found');
  }

  return price;
}

export async function findActivePriceById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  return priceQueries.findFirst({
    where: {
      id,
      isActive: true,
    },
  });
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

export async function listPriceCatalogSnapshots(): Promise<PriceCatalogSnapshot[]> {
  const prices = await priceQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: {
      product: {
        include: {
          plan: true,
        },
      },
    },
  });

  return prices as PriceCatalogSnapshot[];
}

export async function getPriceCatalogSnapshotById(
  id: string,
): Promise<PriceCatalogSnapshot> {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const price = await priceQueries.delegate.findUnique({
    where: { id },
    include: {
      product: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!price) {
    throwError(ERR.NOT_FOUND, 'Price not found');
  }

  return price as PriceCatalogSnapshot;
}

export async function createPrice(data: CreateInput<'Price'>) {
  if (!data?.productId) {
    throwError(ERR.INVALID_INPUT, 'Product ID is required');
  }

  try {
    return await priceCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create price', undefined, e);
  }
}

export async function updatePrice(id: string, data: UpdateInput<'Price'>) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  try {
    return await priceCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update price', undefined, e);
  }
}

export async function deletePrice(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  try {
    return await priceCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete price', undefined, e);
  }
}

export async function findPriceByProductInterval(params: {
  productId: string;
  interval?: BillingInterval | null;
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
  interval?: BillingInterval | null;
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

export async function updatePriceProviderPriceId(
  id: string,
  providerPriceId: string,
) {
  if (!id || !providerPriceId) {
    throwError(ERR.INVALID_INPUT, 'Price id and provider price id are required');
  }

  try {
    return await priceCrud.update(id, {
      providerPriceId,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update provider price id', undefined, e);
  }
}

export async function getPriceCheckoutSnapshotById(
  priceId: string,
): Promise<PriceCheckoutSnapshot> {
  if (!priceId) {
    throwError(ERR.INVALID_INPUT, 'Price ID is required');
  }

  const price = await priceQueries.delegate.findFirst({
    where: {
      id: priceId,
      isActive: true,
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      interval: true,
      providerPriceId: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          description: true,
          plan: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!price) {
    throwError(ERR.NOT_FOUND, 'Active price not found');
  }

  return price;
}

export async function resolveOneTimeCheckoutPrice(params: {
  priceId?: string;
  productCode?: string;
}): Promise<PriceCheckoutSnapshot> {
  if (params.priceId) {
    const price = await getPriceCheckoutSnapshotById(params.priceId);

    if (price.product.type !== 'ONE_TIME') {
      throwError(ERR.INVALID_INPUT, 'Selected price is not a one-time purchase.');
    }

    return price;
  }

  if (!params.productCode) {
    throwError(ERR.INVALID_INPUT, 'Product code is required.');
  }

  const product = await findActiveProductByCode(params.productCode);

  if (!product) {
    throwError(ERR.NOT_FOUND, 'One-time product not found.');
  }

  if (product.type !== 'ONE_TIME') {
    throwError(ERR.INVALID_INPUT, 'Selected product is not a one-time purchase.');
  }

  const prices = await listProductPrices(product.id);
  const price = prices.find((entry) => entry.interval === null) ?? prices[0] ?? null;

  if (!price) {
    throwError(ERR.NOT_FOUND, 'Active one-time price not found.');
  }

  return getPriceCheckoutSnapshotById(price.id);
}

export async function getPublicPlanCheckoutOptions(planKey: string) {
  if (!planKey) {
    throwError(ERR.INVALID_INPUT, 'Plan key is required.');
  }

  const plans = await listPublicPricingPlans();
  const plan = plans.find((entry) => entry.key === planKey) ?? null;

  if (!plan) {
    throwError(ERR.NOT_FOUND, 'Public plan not found.');
  }

  const options = plan.products
    .flatMap((product) =>
      product.prices.map((price) => ({
        priceId: price.id,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        productDescription: product.description ?? null,
        planId: plan.id,
        planKey: plan.key,
        planName: plan.name,
        amount: Number(price.amount),
        currency: price.currency,
        interval: price.interval,
        providerPriceId: price.providerPriceId ?? null,
      })),
    )
    .filter((price) => price.interval !== null)
    .sort((left, right) => {
      if (left.interval === right.interval) {
        return left.amount - right.amount;
      }

      return left.interval === 'MONTHLY' ? -1 : 1;
    });

  if (options.length === 0) {
    throwError(ERR.NOT_FOUND, 'No active subscription prices found for this plan.');
  }

  return {
    plan: {
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description ?? '',
    },
    options,
  };
}

export async function listActiveOneTimePurchaseOffers(): Promise<
  OneTimePurchaseOffer[]
> {
  const products = await productQueries.delegate.findMany({
    where: {
      isActive: true,
      type: ProductType.ONE_TIME,
    },
    select: {
      code: true,
      name: true,
      description: true,
      prices: {
        where: {
          isActive: true,
          interval: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          amount: true,
          currency: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return products
    .map((product): OneTimePurchaseOffer | null => {
      const price = product.prices[0] ?? null;

      if (!price) {
        return null;
      }

      return {
        priceId: price.id,
        productCode: product.code,
        name: product.name,
        description: product.description ?? '',
        amount: Number(price.amount),
        currency: price.currency,
      };
    })
    .filter((product): product is OneTimePurchaseOffer => Boolean(product));
}
