import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { getPlatformFeatureEditorData, getPlatformFeaturesListData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    featureId: string;
  }>;
};

export default async function PlatformCatalogFeatureDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { featureId } = await params;
  const [{ feature }, rows] = await Promise.all([
    getPlatformFeatureEditorData(featureId),
    getPlatformFeaturesListData(),
  ]);

  if (!feature) {
    return null;
  }

  const currentRow = rows.find((row) => row.id === featureId) ?? null;

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={feature.name}
        description="Review feature identity, category, and where it is currently being used in plans and overrides."
        backHref="/platform/catalog/features"
        backLabel="Back to Features"
        actions={
          <Button asChild>
            <Link href={`/platform/catalog/features/${feature.id}/edit`}>Edit Feature</Link>
          </Button>
        }
      />

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Feature Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Key</p>
            <p className="font-medium">{feature.key}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-medium">{feature.category ?? 'General'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sort Order</p>
            <p className="font-medium">{feature.sortOrder}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={feature.isActive ? 'default' : 'outline'}>
              {feature.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Plan Usage</p>
            <p className="font-medium">{currentRow?.planCount ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Workspace Overrides</p>
            <p className="font-medium">{currentRow?.overrideCount ?? 0}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="mt-1 text-sm">{feature.description || 'No description added yet.'}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
