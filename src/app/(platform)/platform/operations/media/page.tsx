import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformOperationsMediaTable } from '@/modules/platform/components/operations/platform-operations-media-table';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformMediaPageData } from '@/modules/media/server/platform-media-admin-page-data';

export default async function PlatformOperationsMediaPage() {
  await requirePlatformAdmin();

  const data = await getPlatformMediaPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total assets</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Ready</CardDescription>
            <CardTitle className="text-3xl">{data.summary.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Processing</CardDescription>
            <CardTitle className="text-3xl">{data.summary.processing}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl">{data.summary.failed}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformOperationsMediaTable rows={data.rows} />
    </div>
  );
}
