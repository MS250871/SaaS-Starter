import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformOperationsSupportTable } from '@/modules/platform/components/operations/platform-operations-support-table';
import { PlatformSupportTicketCreatePanel } from '@/modules/platform/components/operations/platform-support-ticket-create-panel';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { hasAnyPermission } from '@/modules/permissions/permissions.services';
import { getPlatformSupportPageData } from '@/modules/support/server/platform-support-admin-page-data';

export default async function PlatformOperationsSupportPage() {
  const actor = await requirePlatformPermission('platformSupport.read');

  const data = await getPlatformSupportPageData();
  const canCreate = hasAnyPermission(actor.permissions, [
    'platformSupport.update',
    'supportTicket.create',
  ]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total tickets</CardDescription>
            <CardTitle className="text-3xl">{data.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Open escalations</CardDescription>
            <CardTitle className="text-3xl">{data.summary.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Platform escalations</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.platformEscalations}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace-owned</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.workspaceOwned}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformSupportTicketCreatePanel
        workspaceOptions={data.workspaceOptions}
        canCreate={canCreate}
      />

      <PlatformOperationsSupportTable
        rows={data.platformRows}
        title="Platform Escalations"
        description="Workspace escalations that are owned and controlled by platform support."
      />

      <PlatformOperationsSupportTable
        rows={data.workspaceRows}
        title="Workspace-Owned Tickets"
        description="Customer and internal workspace tickets remain owned by the workspace desk. Platform can review them here, but not control them."
      />
    </div>
  );
}
