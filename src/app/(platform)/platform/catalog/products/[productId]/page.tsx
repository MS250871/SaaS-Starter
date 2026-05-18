import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { getPlatformProductEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function PlatformCatalogProductDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { productId } = await params;
  const { product } = await getPlatformProductEditorData(productId);

  if (!product) {
    return null;
  }

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={product.name}
        description="Review the linked plan, product type, and the billing prices attached to this catalog product."
        backHref="/platform/catalog/products"
        backLabel="Back to Products"
        actions={
          <Button asChild>
            <Link href={`/platform/catalog/products/${product.id}/edit`}>Edit Product</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{product.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">
                {product.type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan Link</p>
              <p className="font-medium">{product.plan?.name ?? 'Unlinked'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={product.isActive ? 'default' : 'outline'}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">
                {product.description || 'No description added yet.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Attached Prices</CardTitle>
            <CardDescription>{product.prices.length} price records linked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.prices.length > 0 ? (
              product.prices.map((price) => (
                <div key={price.id} className="rounded-xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {price.interval ?? 'ONE_TIME'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {price.currency} {price.amount}
                      </p>
                    </div>
                    <Badge variant={price.isActive ? 'default' : 'outline'}>
                      {price.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No prices linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
