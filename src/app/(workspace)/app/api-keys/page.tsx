import { WorkspaceApiKeysPanel } from '@/modules/workspace/components/workspace-api-keys-panel';
import { getWorkspaceApiKeysPageData } from '@/modules/workspace/server/workspace-admin-page-data';

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
      canCreate={actor.permissions.includes('apiKey.create')}
      canRotate={
        actor.permissions.includes('apiKey.rotate') ||
        actor.permissions.includes('apiKey.update')
      }
      canRevoke={
        actor.permissions.includes('apiKey.revoke') ||
        actor.permissions.includes('apiKey.delete') ||
        actor.permissions.includes('apiKey.update')
      }
    />
  );
}
