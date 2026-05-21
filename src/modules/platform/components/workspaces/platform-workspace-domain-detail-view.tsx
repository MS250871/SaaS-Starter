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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlatformWorkspaceDomainDetailActions } from '@/modules/platform/components/workspaces/platform-workspace-domain-detail-actions';
import type { getPlatformWorkspaceDomainDetailPageData } from '@/modules/workspace/server/platform-workspace-domain-page-data';

type PlatformWorkspaceDomainDetailData = Awaited<
  ReturnType<typeof getPlatformWorkspaceDomainDetailPageData>
>;

export function PlatformWorkspaceDomainDetailView({
  data,
  canRefreshVerification,
  canSetPrimary,
  canDelete,
}: {
  data: PlatformWorkspaceDomainDetailData;
  canRefreshVerification: boolean;
  canSetPrimary: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>
                /platform/workspaces/domains/{data.domain.id}
              </CardDescription>
              <CardTitle>{data.domain.domain}</CardTitle>
              <CardDescription className="max-w-3xl">
                DNS verification, routing behavior, and managed-provider state for
                this workspace domain record.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={`/platform/workspaces/${data.workspace.id}/routing`}>
                  View routing
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/platform/workspaces/${data.workspace.id}`}>
                  View workspace
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/workspaces/domains">Back to domain queue</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Badge variant={data.domain.isVerified ? 'default' : 'outline'}>
                {data.domain.verificationLabel}
              </Badge>
              <span>{data.domain.statusLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.domain.lastCheckedAtLabel}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Behavior</CardDescription>
            <CardTitle className="text-xl">{data.domain.behaviorLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.domain.typeLabel}</p>
            <p>{data.domain.routingModeLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>DNS Health</CardDescription>
            <CardTitle className="text-xl">{data.domain.dnsHealthLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Target: {data.domain.targetLabel}</p>
            <p>Managed by {data.providerLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.workspace.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.workspace.routeStrategyLabel}</p>
            <p>{data.workspace.currentHostLabel}</p>
            <p>{data.workspace.primaryEmail ?? 'No primary email'}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-background/85">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle>Domain Controls</CardTitle>
              <CardDescription>
                Promote, refresh, or remove this record depending on its current
                routing role and verification state.
              </CardDescription>
            </div>
            <PlatformWorkspaceDomainDetailActions
              workspaceDomainId={data.domain.id}
              canRefreshVerification={canRefreshVerification}
              canSetPrimary={canSetPrimary}
              canDelete={canDelete}
              afterDeleteHref={`/platform/workspaces/${data.workspace.id}/routing`}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Created
            </p>
            <p className="mt-2 text-sm font-medium">{data.domain.createdAtLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Verified
            </p>
            <p className="mt-2 text-sm font-medium">{data.domain.verifiedAtLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Current host
            </p>
            <p className="mt-2 break-all text-sm font-medium">
              {data.workspace.currentHostLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Redirect target
            </p>
            <p className="mt-2 break-all text-sm font-medium">
              {data.domain.redirectTo ?? data.domain.targetLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.domain.lastVerificationError ? (
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Last Verification Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.domain.lastVerificationError}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>DNS Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Expected Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.domain.dnsRecords.length > 0 ? (
                data.domain.dnsRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.host}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.purposeLabel}</TableCell>
                    <TableCell className="max-w-[20rem] break-all">
                      {record.expectedValue}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={record.isMatched ? 'default' : 'outline'}>
                          {record.isMatched ? 'Matched' : 'Pending'}
                        </Badge>
                        {record.lastError ? (
                          <p className="text-xs text-muted-foreground">
                            {record.lastError}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{record.lastCheckedAtLabel}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No DNS records found for this domain.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
