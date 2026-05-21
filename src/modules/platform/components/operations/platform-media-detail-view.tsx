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
import type { getPlatformMediaDetailPageData } from '@/modules/media/server/platform-media-admin-page-data';
import { requeuePlatformMediaJobAction } from '@/modules/media/actions/platform-media-admin.actions';
import { PlatformOperationsAsyncButton } from '@/modules/platform/components/operations/platform-operations-async-button';

type PlatformMediaDetailData = Awaited<
  ReturnType<typeof getPlatformMediaDetailPageData>
>;

export function PlatformMediaDetailView({
  data,
}: {
  data: PlatformMediaDetailData;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>/platform/operations/media/{data.media.id}</CardDescription>
              <CardTitle>{data.media.fileName}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href="/platform/operations/integrations">Webhooks & Outbox</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/operations/media">Back to media</Link>
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
                  data.media.status === 'READY'
                    ? 'default'
                    : data.media.status === 'FAILED'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {data.media.statusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.media.sizeLabel}</p>
            <p>{data.media.mimeType}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.media.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.media.workspaceSlug}</p>
            <p>{data.media.ownerLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Storage</CardDescription>
            <CardTitle className="text-xl">{data.media.storageKey}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Checksum: {data.media.checksum}</p>
            <p>Created: {data.media.createdAtLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Usage</CardDescription>
            <CardTitle className="text-xl">{data.attachments.length} attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.jobs.length} jobs</p>
            <p>Updated: {data.media.updatedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="rounded-2xl border border-border/70 bg-muted/10 p-4 text-sm"
              >
                <p className="font-medium">{attachment.entityType}</p>
                <p className="text-muted-foreground">{attachment.entityId}</p>
                <p className="text-xs text-muted-foreground">{attachment.createdAtLabel}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Processing Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-border/70 bg-muted/10 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{job.jobType}</p>
                        <Badge
                          variant={
                            job.status === 'DONE'
                              ? 'default'
                              : job.status === 'FAILED'
                                ? 'outline'
                                : 'secondary'
                          }
                        >
                          {job.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {job.createdAtLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Processed: {job.processedAtLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">Error: {job.error}</p>
                    </div>
                    {job.canRequeue ? (
                      <PlatformOperationsAsyncButton
                        action={requeuePlatformMediaJobAction}
                        fields={{ mediaJobId: job.id }}
                        label="Requeue job"
                        pendingLabel="Requeueing..."
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/10 p-4 text-xs text-muted-foreground">
                {data.media.metadataJson}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
