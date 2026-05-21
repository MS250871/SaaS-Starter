import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformGovernanceAuditTable } from '@/modules/platform/components/governance/platform-governance-audit-table';
import { getPlatformGovernanceAuditPageData } from '@/modules/audit/server/platform-governance-audit-page-data';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformGovernanceAuditPage() {
  await requirePlatformPermission('platformAudit.read');
  const data = await getPlatformGovernanceAuditPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total events</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-3xl">{data.summary.warnings}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Errors</CardDescription>
            <CardTitle className="text-3xl">{data.summary.errors}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Platform-scoped</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.platformScoped}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformGovernanceAuditTable rows={data.rows} />
    </div>
  );
}
