import { hasPermission } from '@/modules/permissions/services/permissions.services';
import { WorkspaceProfilePanel } from '@/modules/workspace/components/workspace-profile-panel';
import { getWorkspaceProfilePageData } from '@/modules/workspace/server/workspace-admin-page-data';

export default async function WorkspaceSettingsProfilePage() {
  const { actor, assetPreviewUrls, initialProfile, workspaceId } =
    await getWorkspaceProfilePageData();

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
    <WorkspaceProfilePanel
      initialAssetPreviewUrls={assetPreviewUrls}
      initialProfile={initialProfile}
      canManageProfile={hasPermission(
        actor.permissions,
        'workspaceSettings.update',
      )}
    />
  );
}
