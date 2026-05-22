import { WorkspaceApiKeysPanel } from '@/modules/workspace/components/workspace-api-keys-panel';
import { getWorkspaceApiKeysPageData } from '@/modules/workspace/server/workspace-admin-page-data';
import {
  hasAnyPermission,
  hasPermission,
} from '@/modules/permissions/services/permissions.services';

export default async function WorkspaceApiKeysPage() {
  const {
    actor,
    workspaceId,
    apiKeys,
    availableScopes,
    apiKeySummary,
  } = await getWorkspaceApiKeysPageData();

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
    <WorkspaceApiKeysPanel
      apiKeys={apiKeys}
      availableScopes={availableScopes}
      apiKeySummary={apiKeySummary}
      canCreate={hasPermission(actor.permissions, 'apiKey.create')}
      canRotate={hasAnyPermission(actor.permissions, [
        'apiKey.rotate',
        'apiKey.update',
      ])}
      canRevoke={hasAnyPermission(actor.permissions, [
        'apiKey.revoke',
        'apiKey.delete',
        'apiKey.update',
      ])}
    />
  );
}
