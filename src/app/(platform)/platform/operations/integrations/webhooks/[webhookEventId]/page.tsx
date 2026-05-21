import { PlatformIntegrationWebhookDetailView } from '@/modules/platform/components/operations/platform-integration-webhook-detail-view';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWebhookEventDetailPageData } from '@/modules/integration/server/platform-webhook-admin-page-data';

export default async function PlatformOperationsWebhookEventPage({
  params,
}: {
  params: Promise<{ webhookEventId: string }>;
}) {
  await requirePlatformAdmin();
  const { webhookEventId } = await params;
  const data = await getPlatformWebhookEventDetailPageData(webhookEventId);

  return <PlatformIntegrationWebhookDetailView data={data} />;
}
