import { PlatformMediaDetailView } from '@/modules/platform/components/operations/platform-media-detail-view';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformMediaDetailPageData } from '@/modules/media/server/platform-media-admin-page-data';

export default async function PlatformOperationsMediaDetailPage({
  params,
}: {
  params: Promise<{ mediaId: string }>;
}) {
  await requirePlatformAdmin();
  const { mediaId } = await params;
  const data = await getPlatformMediaDetailPageData(mediaId);

  return <PlatformMediaDetailView data={data} />;
}
