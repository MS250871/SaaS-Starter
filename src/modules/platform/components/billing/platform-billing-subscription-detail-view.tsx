import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { getPlatformBillingSubscriptionDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'
import { PlatformBillingSubscriptionControls } from '@/modules/platform/components/billing/platform-billing-subscription-controls'

type PlatformBillingSubscriptionDetailData = Awaited<
  ReturnType<typeof getPlatformBillingSubscriptionDetailPageData>
>

export function PlatformBillingSubscriptionDetailView({
  data,
}: {
  data: PlatformBillingSubscriptionDetailData
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>/platform/billing/subscriptions/{data.subscription.id}</CardDescription>
              <CardTitle>{data.subscription.planName}</CardTitle>
              <CardDescription className="max-w-none">
                Billing anchor, ownership, and provider state for this recurring subscription.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href="/platform/billing/payments">Payments & Invoices</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/billing/refunds">Refunds</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/billing/subscriptions">Back to subscriptions</Link>
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
              <Badge
                variant={
                  ['ACTIVE', 'TRIALING'].includes(data.subscription.status)
                    ? 'default'
                    : data.subscription.status === 'PAST_DUE'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {data.subscription.statusLabel}
              </Badge>
              {data.subscription.cancelAtPeriodEnd ? (
                <Badge variant="secondary">Cancel scheduled</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.subscription.productName}</p>
            <p>{data.subscription.amountLabel} / {data.subscription.intervalLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.subscription.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.subscription.workspaceSlug}</p>
            <p>{data.subscription.ownerLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Billing window</CardDescription>
            <CardTitle className="text-xl">{data.subscription.currentPeriodEndLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Started: {data.subscription.currentPeriodStartLabel}</p>
            <p>{data.subscription.paymentCount} linked payments</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Provider</CardDescription>
            <CardTitle className="text-xl">{data.subscription.providerLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.subscription.providerSubscriptionId}</p>
            <p>Updated: {data.subscription.updatedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>
              Payments currently linked back to this subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Captured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length > 0 ? (
                  data.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{payment.typeLabel}</p>
                          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {payment.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.statusLabel}</TableCell>
                      <TableCell>{payment.amountLabel}</TableCell>
                      <TableCell>{payment.createdAtLabel}</TableCell>
                      <TableCell>{payment.capturedAtLabel}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No linked payments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Subscription Controls</CardTitle>
            <CardDescription>
              Operational controls that are safe to apply from the platform surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformBillingSubscriptionControls
              subscriptionId={data.subscription.id}
              canScheduleCancellation={data.subscription.canScheduleCancellation}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
