import { PlatformPlansTable } from '@/modules/platform/components/catalog/platform-plans-table';
import { getPlatformPlansListData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogPlansPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformPlansListData();

  return <PlatformPlansTable rows={rows} />;
}
