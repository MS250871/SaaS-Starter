import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GovernancePageHeader } from '@/modules/platform/components/governance/governance-page-header';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernanceRoleDetailData } from '@/modules/roles/server/platform-governance-roles-page-data';

type Props = {
  params: Promise<{
    roleId: string;
  }>;
};

export default async function PlatformGovernanceRoleDetailPage({ params }: Props) {
  await requirePlatformAdmin();
  const { roleId } = await params;
  const data = await getPlatformGovernanceRoleDetailData(roleId);

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title={data.role.name}
        description={data.role.description ?? 'Role definition detail and direct permission grants.'}
        backHref="/platform/governance/roles"
        backLabel="Back to Roles"
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Role Overview</CardTitle>
            <CardDescription>
              Scope, assignment posture, and usage counts for this role definition.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Key</p>
              <p className="font-mono text-sm uppercase tracking-[0.14em]">
                {data.role.key}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scope</p>
              <p className="font-medium">{data.role.scope}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={data.role.isActive ? 'default' : 'outline'}>
                  {data.role.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {data.role.isSystem ? <Badge variant="secondary">System</Badge> : null}
                {data.role.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                <Badge variant={data.role.isAssignable ? 'secondary' : 'outline'}>
                  {data.role.isAssignable ? 'Assignable' : 'Locked'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hierarchy Rank</p>
              <p className="font-medium">
                {typeof data.role.hierarchyRank === 'number'
                  ? data.role.hierarchyRank
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Memberships</p>
              <p className="font-medium">
                {data.role._count.platformMemberships + data.role._count.workspaceMemberships}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invites</p>
              <p className="font-medium">
                {data.role._count.platformInvites + data.role._count.workspaceInvites}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Permission Grants</CardTitle>
            <CardDescription>
              Direct permission keys attached to this role before overrides apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.permissions.length > 0 ? (
              data.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="rounded-xl border border-border/70 px-4 py-3"
                >
                  <p className="font-medium">{permission.name ?? permission.key}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {permission.key}
                  </p>
                  <p className="text-sm text-muted-foreground">{permission.entity}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No direct permission grants are attached to this role yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
