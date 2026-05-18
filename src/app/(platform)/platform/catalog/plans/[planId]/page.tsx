import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { getPlatformPlanEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    planId: string;
  }>;
};

export default async function PlatformCatalogPlanDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { planId } = await params;
  const { plan } = await getPlatformPlanEditorData(planId);

  if (!plan) {
    return null;
  }

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={plan.name}
        description="Review the plan contract, attached features, quantitative limits, and linked commercial products."
        backHref="/platform/catalog/plans"
        backLabel="Back to Plans"
        actions={
          <Button asChild>
            <Link href={`/platform/catalog/plans/${plan.id}/edit`}>Edit Plan</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Key</p>
              <p className="font-medium">{plan.key}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sort Order</p>
              <p className="font-medium">{plan.sortOrder}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={plan.isActive ? 'default' : 'outline'}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visibility</p>
              <Badge variant={plan.isPublic ? 'secondary' : 'outline'}>
                {plan.isPublic ? 'Public' : 'Internal'}
              </Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{plan.description || 'No description added yet.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Linked Products</CardTitle>
            <CardDescription>{plan.products.length} products attached</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.products.length > 0 ? (
              plan.products.map((product) => (
                <div key={product.id} className="rounded-xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.code} · {product.type}
                      </p>
                    </div>
                    <Badge variant={product.isActive ? 'default' : 'outline'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No products linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Enabled Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.features.length > 0 ? (
              plan.features.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border/70 px-4 py-3">
                  <p className="font-medium">{entry.feature.name}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {entry.feature.key}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No features attached yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Limit Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.limits.length > 0 ? (
              plan.limits.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.limitDefinition.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.limitDefinition.key}
                      </p>
                    </div>
                    <p className="font-medium">
                      {entry.valueInt}
                      {entry.limitDefinition.unit ? ` ${entry.limitDefinition.unit}` : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No limits assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
