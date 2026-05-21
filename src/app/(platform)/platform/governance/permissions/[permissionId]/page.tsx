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
import { getPlatformGovernancePermissionDetailData } from '@/modules/permissions/server/platform-governance-permission-page-data';

type Props = {
  params: Promise<{
    permissionId: string;
  }>;
};

export default async function PlatformGovernancePermissionDetailPage({
  params,
}: Props) {
  await requirePlatformAdmin();
  const { permissionId } = await params;
  const data = await getPlatformGovernancePermissionDetailData(permissionId);

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title={data.permission.name ?? data.permission.key}
        description={
          data.permission.description ??
          'Canonical permission detail and usage counts.'
        }
        backHref="/platform/governance/roles"
        backLabel="Back to Roles & Permissions"
      />

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Permission Overview</CardTitle>
          <CardDescription>
            Core definition plus usage counts across roles and overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Key</p>
            <p className="font-mono text-sm uppercase tracking-[0.14em]">
              {data.permission.key}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Entity</p>
            <p className="font-medium">{data.permission.entity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={data.permission.isActive ? 'default' : 'outline'}>
              {data.permission.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role Grants</p>
            <p className="font-medium">{data.permission._count.rolePermissions}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Workspace Overrides</p>
            <p className="font-medium">
              {data.permission._count.workspaceRolePermissions}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">User Overrides</p>
            <p className="font-medium">{data.permission._count.userPermissions}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
