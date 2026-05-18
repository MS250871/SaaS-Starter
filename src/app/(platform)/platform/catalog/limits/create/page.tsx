import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformLimitForm } from '@/modules/platform/components/catalog/platform-limit-form';
import { getPlatformLimitEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogCreateLimitPage() {
  await requirePlatformAdmin();
  const data = await getPlatformLimitEditorData();

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Create Limit"
        description="Define a new quantitative entitlement for plan quotas."
        backHref="/platform/catalog/limits"
        backLabel="Back to Limits"
      />
      <PlatformLimitForm mode="create" {...data} />
    </section>
  );
}
