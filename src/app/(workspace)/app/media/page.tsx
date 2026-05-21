import { WorkspaceMediaPanel } from '@/modules/workspace/components/workspace-media-panel';
import { getWorkspaceMediaPageData } from '@/modules/media/server/workspace-media-page-data';

export default async function WorkspaceMediaPage() {
  const data = await getWorkspaceMediaPageData();

  if (!data.workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceMediaPanel
      basePath={data.basePath}
      summary={data.summary}
      rows={data.rows}
    />
  );
}
