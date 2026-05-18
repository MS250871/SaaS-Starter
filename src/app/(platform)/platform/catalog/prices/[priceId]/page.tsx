import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { getPlatformPriceEditorData } from '@/modules/billing/server/platform-billing-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    priceId: string;
  }>;
};

export default async function PlatformCatalogPriceDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { priceId } = await params;
  const { price } = await getPlatformPriceEditorData(priceId);

  if (!price) {
    return null;
  }

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={price.product.name}
        description="Review the exact amount, cadence, provider reference, and linked product for this price record."
        backHref="/platform/catalog/prices"
        backLabel="Back to Prices"
        actions={
          <Button asChild>
            <Link href={`/platform/catalog/prices/${price.id}/edit`}>Edit Price</Link>
          </Button>
        }
      />

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Price Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Product</p>
            <p className="font-medium">
              {price.product.name} · {price.product.code}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="font-medium">{price.product.plan?.name ?? 'Unlinked'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium">
              {price.currency} {price.amount}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interval</p>
            <p className="font-medium">{price.interval ?? 'ONE_TIME'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Provider Price ID</p>
            <p className="font-medium">{price.providerPriceId ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={price.isActive ? 'default' : 'outline'}>
              {price.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
