import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformGovernanceMembershipsTable } from '@/modules/platform/components/governance/platform-governance-memberships-table';
import { getPlatformGovernanceOverviewData } from '@/modules/platform/server/platform-governance-overview-data';
import { getPlatformGovernanceTeamPageData } from '@/modules/platform/server/platform-governance-team-page-data';
import { requirePlatformAnyPermission } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformGovernancePage() {
  await requirePlatformAnyPermission([
    'platformMembership.read',
    'platformInvite.read',
    'platformPermission.read',
    'platformAudit.read',
  ]);

  const [overview, teamData] = await Promise.all([
    getPlatformGovernanceOverviewData(),
    getPlatformGovernanceTeamPageData(),
  ]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Platform operators</CardDescription>
            <CardTitle className="text-3xl">
              {overview.totalMemberships}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active access</CardDescription>
            <CardTitle className="text-3xl">
              {overview.activeMemberships}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Pending invites</CardDescription>
            <CardTitle className="text-3xl">
              {overview.pendingInvites}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active roles</CardDescription>
            <CardTitle className="text-3xl">{overview.activeRoles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active permissions</CardDescription>
            <CardTitle className="text-3xl">
              {overview.activePermissions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Audit events</CardDescription>
            <CardTitle className="text-3xl">{overview.auditEvents}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformGovernanceMembershipsTable rows={teamData.membershipRows} />
    </div>
  );
}
