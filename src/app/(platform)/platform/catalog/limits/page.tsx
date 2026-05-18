import { PlatformLimitsTable } from '@/modules/platform/components/catalog/platform-limits-table';
import { getPlatformLimitsListData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogLimitsPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformLimitsListData();

  return <PlatformLimitsTable rows={rows} />;
}
