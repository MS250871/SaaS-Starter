import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { hasPermission } from '@/modules/permissions/permissions.services';
import { PlatformWorkspaceDomainsTable } from '@/modules/platform/components/workspaces/platform-workspace-domains-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceDomainsPageData } from '@/modules/workspace/server/platform-workspace-admin-data';

export default async function PlatformWorkspaceDomainsPage() {
  const actor = await requirePlatformPermission('platformWorkspace.read');
  const data = await getPlatformWorkspaceDomainsPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total records</CardDescription>
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
            <CardDescription>Primary routes</CardDescription>
            <CardTitle className="text-3xl">{data.summary.primary}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Custom domains</CardDescription>
            <CardTitle className="text-3xl">{data.summary.custom}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformWorkspaceDomainsTable
        rows={data.rows}
        canVerifyDomains={hasPermission(
          actor.permissions,
          'workspaceDomain.verify',
        )}
        canSetPrimaryDomains={hasPermission(
          actor.permissions,
          'workspaceDomain.setPrimary',
        )}
        canDeleteDomains={hasPermission(
          actor.permissions,
          'workspaceDomain.delete',
        )}
      />
    </div>
  );
}
