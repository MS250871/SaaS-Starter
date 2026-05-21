import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformGovernanceTeamSection } from '@/modules/platform/components/governance/platform-governance-team-section';
import { requirePlatformAnyPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernanceTeamPageData } from '@/modules/platform/server/platform-governance-team-page-data';

export default async function PlatformGovernanceTeamPage() {
  const actor = await requirePlatformAnyPermission([
    'platformMembership.read',
    'platformInvite.read',
  ]);
  const data = await getPlatformGovernanceTeamPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <CardDescription>Inactive memberships</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.inactiveMemberships}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total invites</CardDescription>
            <CardTitle className="text-3xl">{data.summary.invites}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Pending invites</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.pendingInvites}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformGovernanceTeamSection
        assignableRoles={data.assignableRoles}
        initialInvites={data.inviteRows}
        initialMemberships={data.membershipRows}
        canManageAssignments={
          actor.platformRoleSystemKeys?.includes('PLATFORM_ADMIN') ?? false
        }
      />
    </div>
  );
}
