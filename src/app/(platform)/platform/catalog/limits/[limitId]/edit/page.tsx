import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformLimitForm } from '@/modules/platform/components/catalog/platform-limit-form';
import { getPlatformLimitEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    limitId: string;
  }>;
};

export default async function PlatformCatalogEditLimitPage({ params }: Props) {
  await requirePlatformAdmin();
  const { limitId } = await params;
  const data = await getPlatformLimitEditorData(limitId);

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={`Edit ${data.limit?.name ?? 'Limit'}`}
        description="Update the limit metadata, unit, and active state."
        backHref={`/platform/catalog/limits/${limitId}`}
        backLabel="Back to Limit"
      />
      <PlatformLimitForm mode="edit" {...data} />
    </section>
  );
}
