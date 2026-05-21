import { PlatformIntegrationOutboxDetailView } from '@/modules/platform/components/operations/platform-integration-outbox-detail-view';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformOutboxEventDetailPageData } from '@/modules/jobs/server/platform-outbox-admin-page-data';

export default async function PlatformOperationsOutboxEventPage({
  params,
}: {
  params: Promise<{ outboxEventId: string }>;
}) {
  await requirePlatformAdmin();
  const { outboxEventId } = await params;
  const data = await getPlatformOutboxEventDetailPageData(outboxEventId);

  return <PlatformIntegrationOutboxDetailView data={data} />;
}
