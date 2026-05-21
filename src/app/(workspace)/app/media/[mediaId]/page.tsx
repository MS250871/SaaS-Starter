import { WorkspaceMediaDetailView } from '@/modules/workspace/components/workspace-media-detail-view';
import { getWorkspaceMediaDetailPageData } from '@/modules/media/server/workspace-media-page-data';

export default async function WorkspaceMediaDetailPage({
  params,
}: {
  params: Promise<{ mediaId: string }>;
}) {
  const { mediaId } = await params;
  const data = await getWorkspaceMediaDetailPageData(mediaId);

  if (!data.workspaceId || !data.media) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Media record not found for this workspace.
        </div>
      </div>
    );
  }

  return <WorkspaceMediaDetailView data={data} />;
}
