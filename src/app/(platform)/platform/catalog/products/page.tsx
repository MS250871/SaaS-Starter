import { PlatformProductsTable } from '@/modules/platform/components/catalog/platform-products-table';
import { getPlatformProductsListData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogProductsPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformProductsListData();

  return <PlatformProductsTable rows={rows} />;
}
