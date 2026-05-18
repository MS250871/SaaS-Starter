import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformProductForm } from '@/modules/platform/components/catalog/platform-product-form';
import { getPlatformProductEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function PlatformCatalogEditProductPage({ params }: Props) {
  await requirePlatformAdmin();
  const { productId } = await params;
  const data = await getPlatformProductEditorData(productId);

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={`Edit ${data.product?.name ?? 'Product'}`}
        description="Update the product profile, plan link, and active catalog state."
        backHref={`/platform/catalog/products/${productId}`}
        backLabel="Back to Product"
      />
      <PlatformProductForm mode="edit" {...data} />
    </section>
  );
}
