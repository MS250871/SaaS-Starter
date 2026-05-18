import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformProductForm } from '@/modules/platform/components/catalog/platform-product-form';
import { getPlatformProductEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogCreateProductPage() {
  await requirePlatformAdmin();
  const data = await getPlatformProductEditorData();

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Create Product"
        description="Add a new commercial offering to the platform catalog."
        backHref="/platform/catalog/products"
        backLabel="Back to Products"
      />
      <PlatformProductForm mode="create" {...data} />
    </section>
  );
}
