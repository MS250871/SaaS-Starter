import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { PlatformCustomersTable } from '@/modules/platform/components/identities/platform-customers-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformCustomersPageData } from '@/modules/customer/server/platform-customer-admin-data';

export default async function PlatformIdentityCustomersPage() {
  await requirePlatformPermission('customer.read');
  const data = await getPlatformCustomersPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total customers</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspaces</CardDescription>
            <CardTitle className="text-3xl">{data.summary.workspaces}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>External linked</CardDescription>
            <CardTitle className="text-3xl">{data.summary.external}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Inactive identity links</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.inactiveIdentityLinks}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformCustomersTable rows={data.rows} />
    </div>
  );
}
