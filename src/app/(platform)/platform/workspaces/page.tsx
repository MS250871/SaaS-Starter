import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { hasAnyPermission } from '@/modules/permissions/permissions.services';
import { PlatformWorkspacesTable } from '@/modules/platform/components/workspaces/platform-workspaces-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspacesPageData } from '@/modules/workspace/server/platform-workspace-admin-data';

export default async function PlatformWorkspacesPage() {
  const actor = await requirePlatformPermission('platformWorkspace.read');
  const data = await getPlatformWorkspacesPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total</CardDescription>
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
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-3xl">{data.summary.paid}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Free path</CardDescription>
            <CardTitle className="text-3xl">{data.summary.freePath}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Subdomain</CardDescription>
            <CardTitle className="text-3xl">{data.summary.subdomain}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Custom domain</CardDescription>
            <CardTitle className="text-3xl">{data.summary.customDomain}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformWorkspacesTable
        rows={data.rows}
        canToggleWorkspaces={hasAnyPermission(actor.permissions, [
          'platformWorkspace.update',
          'platformWorkspace.deactivate',
        ])}
      />
    </div>
  );
}
