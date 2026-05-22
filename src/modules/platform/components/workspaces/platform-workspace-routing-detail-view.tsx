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
import {
  deletePlatformWorkspaceDomainAction,
  refreshPlatformWorkspaceDomainVerificationAction,
  setPlatformWorkspacePrimaryDomainAction,
} from '@/modules/workspace/actions/platform-workspace-domain-admin.actions';
import { PlatformWorkspaceDomainRowMenu } from '@/modules/platform/components/workspaces/menus/platform-workspace-domain-row-menu';
import { PlatformWorkspaceRoutingControls } from '@/modules/platform/components/workspaces/platform-workspace-routing-controls';
import type { getPlatformWorkspaceRoutingDetailPageData } from '@/modules/workspace/server/platform-workspace-domain-page-data';

type PlatformWorkspaceRoutingDetailData = Awaited<
  ReturnType<typeof getPlatformWorkspaceRoutingDetailPageData>
>;

export function PlatformWorkspaceRoutingDetailView({
  data,
  canCreateDomains,
  canVerifyDomains,
  canSetPrimaryDomains,
  canDeleteDomains,
  canResyncRouting,
}: {
  data: PlatformWorkspaceRoutingDetailData;
  canCreateDomains: boolean;
  canVerifyDomains: boolean;
  canSetPrimaryDomains: boolean;
  canDeleteDomains: boolean;
  canResyncRouting: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>
                /platform/workspaces/{data.workspace.id}/routing
              </CardDescription>
              <CardTitle>{data.workspace.name}</CardTitle>
              <CardDescription className="max-w-3xl">
                Routing control surface for host strategy, verification, and DNS
                posture across free path, subdomain, and custom-domain entry
                points.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
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
            <CardDescription>Effective strategy</CardDescription>
            <CardTitle className="text-xl">
              {data.workspace.routeStrategyLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.workspace.currentHostLabel}</p>
            <p>Managed subdomain: {data.workspace.managedSubdomainHost}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Commercial posture</CardDescription>
            <CardTitle className="text-xl">
              {data.workspace.activePlanName ?? 'No paid plan'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.workspace.activePlanKey ?? 'Trial or free path'}</p>
            <p>
              {data.workspace.activeSubscriptionStatus ?? 'No active subscription'}
            </p>
            <p>Renews: {data.workspace.renewalAtLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Entitlement state</CardDescription>
            <CardTitle className="text-xl">
              {data.entitlements.canUseCustomDomain
                ? 'Custom domains enabled'
                : data.entitlements.canUseSubdomain
                  ? 'Subdomain enabled'
                  : 'Free path only'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              {data.entitlements.currentCustomDomainCount} configured custom
              domains
            </p>
            <p>
              {data.entitlements.customDomainSlots > 0
                ? `${data.entitlements.remainingCustomDomainSlots} custom-domain slots remaining`
                : 'No slot cap configured'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Infrastructure</CardDescription>
            <CardTitle className="text-xl">{data.providerLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Root domain: {data.workspace.rootDomain}</p>
            <p>Path access: {data.workspace.pathAccessLabel}</p>
            <p>Created: {data.workspace.createdAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <PlatformWorkspaceRoutingControls
        workspaceId={data.workspace.id}
        workspaceName={data.workspace.name}
        providerLabel={data.providerLabel}
        canResyncRouting={canResyncRouting}
        canCreateDomains={canCreateDomains}
        canUseCustomDomain={data.entitlements.canUseCustomDomain}
        hasPrimaryCustomDomain={data.hasPrimaryCustomDomain}
        hasRedirectAlias={data.hasRedirectAlias}
        customDomainSlots={data.entitlements.customDomainSlots}
        currentCustomDomainCount={data.entitlements.currentCustomDomainCount}
        remainingCustomDomainSlots={data.entitlements.remainingCustomDomainSlots}
      />

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Workspace Domain Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>DNS Health</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length > 0 ? (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.domain}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.typeLabel} / {row.routingModeLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{row.behaviorLabel}</p>
                        {row.redirectTo ? (
                          <p className="text-xs text-muted-foreground">
                            Redirects to {row.redirectTo}
                            {row.redirectStatusCode
                              ? ` (${row.redirectStatusCode})`
                              : ''}
                          </p>
                        ) : row.target ? (
                          <p className="text-xs text-muted-foreground">
                            Target {row.target}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={row.isVerified ? 'default' : 'outline'}>
                          {row.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {row.statusLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{row.dnsHealthLabel}</TableCell>
                    <TableCell>{row.lastCheckedAtLabel}</TableCell>
                    <TableCell>
                      <PlatformWorkspaceDomainRowMenu
                        workspaceId={data.workspace.id}
                        workspaceDomainId={row.id}
                        domainType={row.type}
                        isPrimary={row.isPrimary}
                        isVerified={row.isVerified}
                        canVerifyDomains={canVerifyDomains}
                        canSetPrimaryDomains={canSetPrimaryDomains}
                        canDeleteDomains={canDeleteDomains}
                        refreshVerificationAction={
                          refreshPlatformWorkspaceDomainVerificationAction
                        }
                        setPrimaryAction={setPlatformWorkspacePrimaryDomainAction}
                        deleteAction={deletePlatformWorkspaceDomainAction}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No domain records found for this workspace.
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
