import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { getPlatformWebhookEventDetailPageData } from '@/modules/integration/server/platform-webhook-admin-page-data';
import { requeuePlatformWebhookEventAction } from '@/modules/integration/actions/platform-webhook-admin.actions';
import { PlatformOperationsAsyncButton } from '@/modules/platform/components/operations/platform-operations-async-button';

type PlatformWebhookDetailData = Awaited<
  ReturnType<typeof getPlatformWebhookEventDetailPageData>
>;

export function PlatformIntegrationWebhookDetailView({
  data,
}: {
  data: PlatformWebhookDetailData;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>
                /platform/operations/integrations/webhooks/{data.event.id}
              </CardDescription>
              <CardTitle>{data.event.eventType}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              {data.event.canRequeue ? (
                <PlatformOperationsAsyncButton
                  action={requeuePlatformWebhookEventAction}
                  fields={{ webhookEventId: data.event.id }}
                  label="Requeue webhook"
                  pendingLabel="Requeueing..."
                />
              ) : null}
              <Button asChild variant="outline">
                <Link href="/platform/operations/integrations">Back to integrations</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-xl">
              <Badge
                variant={
                  data.event.status === 'PROCESSED'
                    ? 'default'
                    : data.event.status === 'FAILED'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {data.event.statusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.event.providerLabel}</p>
            <p>{data.event.attempts} attempts</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Scope</CardDescription>
            <CardTitle className="text-xl">{data.event.ownerLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.event.ownerSubLabel}</p>
            <p>{data.event.createdAtLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>External Event</CardDescription>
            <CardTitle className="text-xl">{data.event.externalId}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Retry Window</CardDescription>
            <CardTitle className="text-xl">{data.event.nextRetryAtLabel}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Processed: {data.event.processedAtLabel}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Payload</CardTitle>
        </CardHeader>
        <CardContent>
          {data.event.errorSummary ? (
            <p className="mb-4 text-sm text-muted-foreground">
              {data.event.errorSummary}
            </p>
          ) : null}
          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/10 p-4 text-xs text-muted-foreground">
            {data.event.payloadJson}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
