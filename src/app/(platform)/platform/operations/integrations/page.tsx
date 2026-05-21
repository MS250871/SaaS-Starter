import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlatformOperationsOutboxTable } from '@/modules/platform/components/operations/platform-operations-outbox-table';
import { PlatformOperationsWebhooksTable } from '@/modules/platform/components/operations/platform-operations-webhooks-table';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWebhookEventsPageData } from '@/modules/integration/server/platform-webhook-admin-page-data';
import { getPlatformOutboxEventsPageData } from '@/modules/jobs/server/platform-outbox-admin-page-data';

export default async function PlatformOperationsIntegrationsPage() {
  await requirePlatformAdmin();

  const [webhooks, outbox] = await Promise.all([
    getPlatformWebhookEventsPageData(),
    getPlatformOutboxEventsPageData(),
  ]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Webhook events</CardDescription>
            <CardTitle className="text-3xl">{webhooks.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Webhook failures</CardDescription>
            <CardTitle className="text-3xl">{webhooks.summary.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Outbox events</CardDescription>
            <CardTitle className="text-3xl">{outbox.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Outbox failures</CardDescription>
            <CardTitle className="text-3xl">{outbox.summary.failed}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <PlatformOperationsWebhooksTable rows={webhooks.rows} />
      <PlatformOperationsOutboxTable rows={outbox.rows} />
    </div>
  );
}
