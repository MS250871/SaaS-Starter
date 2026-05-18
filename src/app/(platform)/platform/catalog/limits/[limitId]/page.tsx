import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { getPlatformLimitEditorData, getPlatformLimitsListData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    limitId: string;
  }>;
};

export default async function PlatformCatalogLimitDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { limitId } = await params;
  const [{ limit }, rows] = await Promise.all([
    getPlatformLimitEditorData(limitId),
    getPlatformLimitsListData(),
  ]);

  if (!limit) {
    return null;
  }

  const currentRow = rows.find((row) => row.id === limitId) ?? null;

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={limit.name}
        description="Review limit identity, unit, and usage across plans and overrides."
        backHref="/platform/catalog/limits"
        backLabel="Back to Limits"
        actions={
          <Button asChild>
            <Link href={`/platform/catalog/limits/${limit.id}/edit`}>Edit Limit</Link>
          </Button>
        }
      />

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Limit Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Key</p>
            <p className="font-medium">{limit.key}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unit</p>
            <p className="font-medium">{limit.unit ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sort Order</p>
            <p className="font-medium">{limit.sortOrder}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={limit.isActive ? 'default' : 'outline'}>
              {limit.isActive ? 'Active' : 'Inactive'}
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
            <p className="mt-1 text-sm">{limit.description || 'No description added yet.'}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
