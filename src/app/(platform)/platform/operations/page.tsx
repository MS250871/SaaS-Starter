import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformOperationsSupportTable } from '@/modules/platform/components/operations/platform-operations-support-table';
import { requirePlatformAnyPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformOperationsOverviewData } from '@/modules/platform/server/platform-operations-overview-data';
import { getPlatformSupportPageData } from '@/modules/support/server/platform-support-admin-page-data';

export default async function PlatformOperationsPage() {
  await requirePlatformAnyPermission([
    'platformSupport.read',
    'notification.read',
    'media.read',
  ]);

  const [overview, support] = await Promise.all([
    getPlatformOperationsOverviewData(),
    getPlatformSupportPageData(),
  ]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {overview.resources.map((resource) => (
          <Link key={resource.href} href={resource.href}>
            <Card className="h-full border-border/70 bg-background/85 transition-colors hover:border-accent/50">
              <CardHeader>
                <CardTitle>{resource.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-3xl font-semibold">{resource.totalCount}</p>
                  <p className="text-sm text-muted-foreground">{resource.stats}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <PlatformOperationsSupportTable
        rows={support.platformRows.slice(0, 12)}
        title="Recent Support"
        description="Recent platform-owned escalations."
      />
    </div>
  );
}
