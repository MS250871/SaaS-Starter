import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformFeatureForm } from '@/modules/platform/components/catalog/platform-feature-form';
import { getPlatformFeatureEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    featureId: string;
  }>;
};

export default async function PlatformCatalogEditFeaturePage({ params }: Props) {
  await requirePlatformAdmin();
  const { featureId } = await params;
  const data = await getPlatformFeatureEditorData(featureId);

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={`Edit ${data.feature?.name ?? 'Feature'}`}
        description="Update the feature metadata, category, and active state."
        backHref={`/platform/catalog/features/${featureId}`}
        backLabel="Back to Feature"
      />
      <PlatformFeatureForm mode="edit" {...data} />
    </section>
  );
}
