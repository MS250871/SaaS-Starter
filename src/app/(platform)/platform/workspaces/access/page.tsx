import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformWorkspaceInvitesTable } from '@/modules/platform/components/workspaces/platform-workspace-invites-table';
import { PlatformWorkspaceMembershipsTable } from '@/modules/platform/components/workspaces/platform-workspace-memberships-table';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceAccessPageData } from '@/modules/workspace/server/platform-workspace-admin-data';

export default async function PlatformWorkspaceAccessPage() {
  await requirePlatformPermission('platformWorkspace.read');
  const data = await getPlatformWorkspaceAccessPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Memberships</CardDescription>
            <CardTitle className="text-3xl">{data.summary.memberships}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active memberships</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.activeMemberships}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Invites</CardDescription>
            <CardTitle className="text-3xl">{data.summary.invites}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Pending invites</CardDescription>
            <CardTitle className="text-3xl">{data.summary.pendingInvites}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformWorkspaceMembershipsTable rows={data.membershipRows} />
      <PlatformWorkspaceInvitesTable rows={data.inviteRows} />
    </div>
  );
}
