import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformFeatureForm } from '@/modules/platform/components/catalog/platform-feature-form';
import { getPlatformFeatureEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogCreateFeaturePage() {
  await requirePlatformAdmin();
  const data = await getPlatformFeatureEditorData();

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Create Feature"
        description="Define a new reusable capability flag for the platform catalog."
        backHref="/platform/catalog/features"
        backLabel="Back to Features"
      />
      <PlatformFeatureForm mode="create" {...data} />
    </section>
  );
}
