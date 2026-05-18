import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformPriceForm } from '@/modules/platform/components/catalog/platform-price-form';
import { getPlatformPriceEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogCreatePricePage() {
  await requirePlatformAdmin();
  const data = await getPlatformPriceEditorData();

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Create Price"
        description="Attach a billable amount and cadence to a product."
        backHref="/platform/catalog/prices"
        backLabel="Back to Prices"
      />
      <PlatformPriceForm mode="create" {...data} />
    </section>
  );
}
