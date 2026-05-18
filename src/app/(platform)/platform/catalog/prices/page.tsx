import { PlatformPricesTable } from '@/modules/platform/components/catalog/platform-prices-table';
import { getPlatformPricesListData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogPricesPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformPricesListData();

  return <PlatformPricesTable rows={rows} />;
}
