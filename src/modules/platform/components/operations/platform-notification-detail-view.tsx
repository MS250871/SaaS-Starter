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
import type { getPlatformNotificationDetailPageData } from '@/modules/notifications/server/platform-notifications-admin-page-data';
import { replayPlatformNotificationDeliveryAction } from '@/modules/notifications/actions/platform-notification-admin.actions';
import { PlatformOperationsTaskButton } from '@/modules/platform/components/operations/controls/platform-operations-task-button';

type PlatformNotificationDetailData = Awaited<
  ReturnType<typeof getPlatformNotificationDetailPageData>
>;

export function PlatformNotificationDetailView({
  data,
}: {
  data: PlatformNotificationDetailData;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>
                /platform/operations/notifications/{data.notification.id}
              </CardDescription>
              <CardTitle>{data.notification.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href="/platform/operations/integrations">Webhooks & Outbox</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/operations/notifications">Back to notifications</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Target</CardDescription>
            <CardTitle className="text-xl">{data.notification.targetTypeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.notification.recipientLabel}</p>
            <p>{data.notification.recipientSubLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.notification.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.notification.workspaceSlug}</p>
            <p>{data.notification.readLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Type</CardDescription>
            <CardTitle className="text-xl">{data.notification.typeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.notification.deliveryCount} deliveries</p>
            <p>{data.notification.createdAtLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Read State</CardDescription>
            <CardTitle className="text-xl">
              <Badge variant={data.notification.isRead ? 'secondary' : 'default'}>
                {data.notification.readLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 text-sm whitespace-pre-wrap">
              {data.notification.body || 'No body content'}
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/10 p-4 text-xs text-muted-foreground">
              {data.notification.payloadJson}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-2xl border border-border/70 bg-muted/10 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{delivery.channelLabel}</p>
                      <Badge
                        variant={
                          delivery.status === 'DELIVERED'
                            ? 'default'
                            : delivery.status === 'FAILED'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {delivery.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{delivery.recipient}</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {delivery.providerLabel}
                    </p>
                  </div>
                  {delivery.canReplay ? (
                    <PlatformOperationsTaskButton
                      action={replayPlatformNotificationDeliveryAction}
                      fields={{ deliveryId: delivery.id }}
                      label="Replay delivery"
                      pendingLabel="Replaying..."
                    />
                  ) : null}
                </div>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  <p>Subject: {delivery.subject}</p>
                  <p>Sent: {delivery.sentAtLabel}</p>
                  <p>Delivered: {delivery.deliveredAtLabel}</p>
                  <p>Failed: {delivery.failedAtLabel}</p>
                  <p>Error: {delivery.errorMessage}</p>
                  <p>Created: {delivery.createdAtLabel}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
