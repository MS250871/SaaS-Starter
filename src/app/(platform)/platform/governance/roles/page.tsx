import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformGovernancePermissionsTable } from '@/modules/platform/components/governance/platform-governance-permissions-table';
import { PlatformGovernanceRolesTable } from '@/modules/platform/components/governance/platform-governance-roles-table';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernanceRolesPageData } from '@/modules/roles/server/platform-governance-roles-page-data';

export default async function PlatformGovernanceRolesPage() {
  await requirePlatformAdmin();
  const data = await getPlatformGovernanceRolesPageData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Total roles</CardDescription>
            <CardTitle className="text-3xl">{data.summary.roles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active roles</CardDescription>
            <CardTitle className="text-3xl">{data.summary.activeRoles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Platform roles</CardDescription>
            <CardTitle className="text-3xl">{data.summary.platformRoles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace roles</CardDescription>
            <CardTitle className="text-3xl">{data.summary.workspaceRoles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Permissions</CardDescription>
            <CardTitle className="text-3xl">{data.summary.permissions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Active permissions</CardDescription>
            <CardTitle className="text-3xl">
              {data.summary.activePermissions}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformGovernanceRolesTable rows={data.roleRows} />
      <PlatformGovernancePermissionsTable rows={data.permissionRows} />
    </div>
  );
}
