import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { PlatformIdentitiesTable } from '@/modules/platform/components/identities/platform-identities-table';
import { requirePlatformAnyPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformIdentitiesPageData } from '@/modules/auth/server/platform-identity-admin-data';

export default async function PlatformIdentitiesPage() {
  await requirePlatformAnyPermission(['identity.read', 'customer.read']);
  const data = await getPlatformIdentitiesPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total identities</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{data.summary.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Customer-linked</CardDescription>
            <CardTitle className="text-3xl">{data.summary.customerLinked}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Platform operators</CardDescription>
            <CardTitle className="text-3xl">{data.summary.platformTeam}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformIdentitiesTable rows={data.rows} />
    </div>
  );
}
