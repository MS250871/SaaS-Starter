import { PlatformFeaturesTable } from '@/modules/platform/components/catalog/platform-features-table';
import { getPlatformFeaturesListData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogFeaturesPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformFeaturesListData();

  return <PlatformFeaturesTable rows={rows} />;
}
