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
import type { getPlatformIdentityDetailPageData } from '@/modules/auth/server/platform-identity-admin-data';
import type { PlatformCustomerRow } from '@/modules/customer/server/platform-customer-admin-data';

type PlatformIdentityDetailData = Awaited<
  ReturnType<typeof getPlatformIdentityDetailPageData>
>;

export function PlatformIdentityDetailView({
  data,
  customers,
}: {
  data: PlatformIdentityDetailData;
  customers: PlatformCustomerRow[];
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>/platform/identities/{data.identity.id}</CardDescription>
              <CardTitle>{data.identity.displayName}</CardTitle>
              <CardDescription className="max-w-none">
                Global identity view spanning login surfaces, session posture,
                and linked workspace-customer relationships.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href="/platform/identities/accounts">Accounts & Auth</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/identities/sessions">Sessions & OTP</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/identities">Back to identities</Link>
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
              <Badge variant={data.identity.isActive ? 'default' : 'outline'}>
                {data.identity.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.identity.email ?? 'No email'}</p>
            <p>{data.identity.phone ?? 'No phone'}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Auth surface</CardDescription>
            <CardTitle className="text-xl">
              {data.identity.authAccountCount} accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.accounts.filter((account) => account.isVerified).length} verified</p>
            <p>{data.sessions.length} recent sessions</p>
            <p>{data.otpRequests.length} OTP requests</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Relationships</CardDescription>
            <CardTitle className="text-xl">
              {data.identity.customerCount} customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.identity.membershipCount} memberships</p>
            <p>{data.identity.platformTeamCount} platform team links</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Timestamps</CardDescription>
            <CardTitle className="text-xl">Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Created: {data.identity.createdAtLabel}</p>
            <p>Updated: {data.identity.updatedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Auth Accounts</CardTitle>
            <CardDescription>All email and phone login surfaces for this identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.length > 0 ? (
                  data.accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{account.value}</p>
                          <p className="text-xs text-muted-foreground">{account.typeLabel}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.isVerified ? 'default' : 'outline'}>
                          {account.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.passwordLabel}</TableCell>
                      <TableCell>{account.createdAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No auth accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Customer Links</CardTitle>
            <CardDescription>
              Workspace-customer relationships linked to this identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{customer.workspaceName}</p>
                          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {customer.workspaceSlug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{customer.externalId ?? 'N/A'}</TableCell>
                      <TableCell>{customer.createdAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No customer relationships found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Recent session posture across platform, workspace, and customer surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Context</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.length > 0 ? (
                  data.sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{session.contextLabel}</p>
                          <p className="text-xs text-muted-foreground">{session.deviceLabel}</p>
                        </div>
                      </TableCell>
                      <TableCell>{session.statusLabel}</TableCell>
                      <TableCell>{session.lastSeenAtLabel}</TableCell>
                      <TableCell>{session.createdAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No recent sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>OTP Requests</CardTitle>
            <CardDescription>
              Outstanding and recently active verification requests for this identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.otpRequests.length > 0 ? (
                  data.otpRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.accountLabel}</TableCell>
                      <TableCell>{request.purposeLabel}</TableCell>
                      <TableCell>{request.statusLabel}</TableCell>
                      <TableCell>{request.updatedAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No OTP requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
