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
import type { getPlatformWorkspaceDetailPageData } from '@/modules/workspace/server/platform-workspace-admin-data';

type PlatformWorkspaceDetailData = Awaited<
  ReturnType<typeof getPlatformWorkspaceDetailPageData>
>;

export function PlatformWorkspaceDetailView({
  data,
}: {
  data: PlatformWorkspaceDetailData;
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>/platform/workspaces/{data.workspace.id}</CardDescription>
              <CardTitle>{data.workspace.name}</CardTitle>
              <CardDescription className="max-w-3xl">
                Workspace control-plane view for routing, team, pending access,
                and commercial posture.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/platform/workspaces/access">Open access queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/platform/workspaces/${data.workspace.id}/routing`}>
                  Open workspace routing
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/workspaces">Back to workspaces</Link>
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
              <Badge variant={data.workspace.isActive ? 'default' : 'outline'}>
                {data.workspace.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <span>{data.workspace.routeStrategyLabel}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.workspace.currentHostLabel}
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
            <p>{data.workspace.activePlanKey ?? 'Trial or free-path state'}</p>
            <p>
              {data.workspace.activeSubscriptionStatus ?? 'No active subscription'}
            </p>
            <p>Renews: {data.workspace.renewalAtLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>People</CardDescription>
            <CardTitle className="text-xl">
              {data.workspace.memberCount} members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.workspace.customerCount} customers</p>
            <p>{data.workspace.inviteCount} invites</p>
            <p>{data.workspace.apiKeyCount} API keys</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Identity</CardDescription>
            <CardTitle className="text-xl">{data.workspace.slug}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.workspace.primaryEmail ?? 'No primary email'}</p>
            <p>{data.workspace.defaultDomain ?? 'No default domain'}</p>
            <p>Created: {data.workspace.createdAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Domains</CardTitle>
            <CardDescription>
              Current routing records and verification posture for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.domains.length > 0 ? (
                  data.domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{domain.domain}</p>
                          <p className="text-xs text-muted-foreground">
                            {domain.isPrimary ? 'Primary route' : 'Secondary route'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{domain.typeLabel}</TableCell>
                      <TableCell>
                        <Badge variant={domain.isVerified ? 'default' : 'outline'}>
                          {domain.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{domain.lastCheckedAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No domain records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Active Members</CardTitle>
            <CardDescription>
              Current workspace team composition and assigned roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.length > 0 ? (
                  data.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{member.memberName}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.memberEmail ?? 'No email'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{member.roleName}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.roleKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{member.createdAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No active members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
          <CardDescription>
            Invite records that still need acceptance or expiry handling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pendingInvites.length > 0 ? (
                data.pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{invite.roleName}</TableCell>
                    <TableCell>{invite.expiresAtLabel}</TableCell>
                    <TableCell>{invite.createdAtLabel}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No pending invites found.
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
