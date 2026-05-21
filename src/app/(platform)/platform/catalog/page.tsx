import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformCatalogOverviewData } from '@/modules/platform/server/platform-catalog-overview-data';

export default async function PlatformCatalogPage() {
  await requirePlatformAdmin();
  const resources = await getPlatformCatalogOverviewData();

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <Link key={resource.href} href={resource.href}>
          <Card className="h-full border-border/70 bg-background/85 transition-colors hover:border-accent/50">
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-semibold">{resource.totalCount}</p>
                <p className="text-sm text-muted-foreground">{resource.stats}</p>
              </div>
              <p className="text-sm font-medium text-accent">Open management view</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}
