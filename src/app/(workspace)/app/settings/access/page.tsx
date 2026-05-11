import { WorkspaceAccessPanel } from '@/modules/workspace/components/workspace-access-panel';
import { getWorkspaceAccessPageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceSettingsAccessPage() {
  const {
    actor,
    workspaceId,
    roles,
    permissionsByEntity,
    userOverrides,
    members,
    accessSummary,
  } = await getWorkspaceAccessPageData();

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceAccessPanel
      roles={roles}
      permissionsByEntity={permissionsByEntity}
      userOverrides={userOverrides}
      members={members}
      accessSummary={accessSummary}
      canManageAccess={
        actor.permissions.includes('permission.grant') ||
        actor.permissions.includes('permission.revoke') ||
        actor.permissions.includes('permission.update')
      }
    />
  );
}
