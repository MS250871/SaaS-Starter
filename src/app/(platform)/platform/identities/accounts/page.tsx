import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { PlatformAuthAccountsTable } from '@/modules/platform/components/identities/platform-auth-accounts-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformIdentityAccountsPageData } from '@/modules/auth/server/platform-identity-admin-data';

export default async function PlatformIdentityAccountsPage() {
  await requirePlatformPermission('identity.read');
  const data = await getPlatformIdentityAccountsPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total accounts</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-3xl">{data.summary.verified}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Email accounts</CardDescription>
            <CardTitle className="text-3xl">{data.summary.email}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Phone accounts</CardDescription>
            <CardTitle className="text-3xl">{data.summary.phone}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformAuthAccountsTable rows={data.rows} />
    </div>
  );
}
