import { PlatformWorkspaceDetailView } from '@/modules/platform/components/workspaces/platform-workspace-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceDetailPageData } from '@/modules/workspace/server/platform-workspace-admin-data';

export default async function PlatformWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  await requirePlatformPermission('platformWorkspace.read');
  const { workspaceId } = await params;
  const data = await getPlatformWorkspaceDetailPageData(workspaceId);

  return <PlatformWorkspaceDetailView data={data} />;
}
