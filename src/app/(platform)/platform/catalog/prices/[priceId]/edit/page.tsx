import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformPriceForm } from '@/modules/platform/components/catalog/platform-price-form';
import { getPlatformPriceEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    priceId: string;
  }>;
};

export default async function PlatformCatalogEditPricePage({ params }: Props) {
  await requirePlatformAdmin();
  const { priceId } = await params;
  const data = await getPlatformPriceEditorData(priceId);

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Edit Price"
        description="Update the amount, cadence, linked product, and provider reference."
        backHref={`/platform/catalog/prices/${priceId}`}
        backLabel="Back to Price"
      />
      <PlatformPriceForm mode="edit" {...data} />
    </section>
  );
}
