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
import type { getPlatformOutboxEventDetailPageData } from '@/modules/jobs/server/platform-outbox-admin-page-data';
import { requeuePlatformOutboxEventAction } from '@/modules/jobs/actions/platform-outbox-admin.actions';
import { PlatformOperationsAsyncButton } from '@/modules/platform/components/operations/platform-operations-async-button';

type PlatformOutboxDetailData = Awaited<
  ReturnType<typeof getPlatformOutboxEventDetailPageData>
>;

export function PlatformIntegrationOutboxDetailView({
  data,
}: {
  data: PlatformOutboxDetailData;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>
                /platform/operations/integrations/outbox/{data.event.id}
              </CardDescription>
              <CardTitle>{data.event.eventType}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              {data.event.canRequeue ? (
                <PlatformOperationsAsyncButton
                  action={requeuePlatformOutboxEventAction}
                  fields={{ outboxEventId: data.event.id }}
                  label="Requeue outbox"
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
                  data.event.status === 'DONE'
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
            <p>{data.event.attempts} attempts</p>
            <p>Locked: {data.event.lockedAtLabel}</p>
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
            <CardDescription>Processing Key</CardDescription>
            <CardTitle className="text-xl">{data.event.processingKey}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Job: {data.event.jobId}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Schedule</CardDescription>
            <CardTitle className="text-xl">{data.event.scheduledAtLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Next retry: {data.event.nextRetryAtLabel}</p>
            <p>Processed: {data.event.processedAtLabel}</p>
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
