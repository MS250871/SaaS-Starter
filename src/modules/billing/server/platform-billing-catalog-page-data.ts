import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getPriceCatalogSnapshotById,
  getProductCatalogSnapshotById,
  listPriceCatalogSnapshots,
  listProductCatalogSnapshots,
} from '@/modules/billing/services/catalog.services';
import { listPlans } from '@/modules/entitlements/entitlement.services';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Calcutta',
  }).format(date);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function getPlatformProductsListData() {
  return withActionTxContext(async () => {
    const products = await listProductCatalogSnapshots();

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      planId: product.planId,
      planName: product.plan?.name ?? 'Unlinked',
      type: product.type,
      description: product.description ?? '',
      isActive: product.isActive,
      priceCount: product.prices.length,
      activePriceCount: product.prices.filter((price) => price.isActive).length,
      updatedAtLabel: formatDate(product.updatedAt),
    }));
  });
}

export async function getPlatformPricesListData() {
  return withActionTxContext(async () => {
    const prices = await listPriceCatalogSnapshots();

    return prices.map((price) => ({
      id: price.id,
      productId: price.productId,
      productName: price.product.name,
      productCode: price.product.code,
      productType: price.product.type,
      planName: price.product.plan?.name ?? 'Unlinked',
      amountLabel: formatCurrency(Number(price.amount), price.currency),
      currency: price.currency,
      interval: price.interval ?? 'ONE_TIME',
      providerPriceId: price.providerPriceId ?? '',
      isActive: price.isActive,
      createdAtLabel: formatDate(price.createdAt),
    }));
  });
}

export async function getPlatformProductEditorData(productId?: string) {
  return withActionTxContext(async () => ({
    product: productId ? await getProductCatalogSnapshotById(productId) : null,
    plans: await listPlans(),
  }));
}

export async function getPlatformPriceEditorData(priceId?: string) {
  return withActionTxContext(async () => ({
    price: priceId ? await getPriceCatalogSnapshotById(priceId) : null,
    products: await listProductCatalogSnapshots(),
  }));
}
