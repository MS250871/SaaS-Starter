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
import type { getPlatformBillingPaymentDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'
import { PlatformBillingRefundPanel } from '@/modules/platform/components/billing/platform-billing-refund-panel'

type PlatformBillingPaymentDetailData = Awaited<
  ReturnType<typeof getPlatformBillingPaymentDetailPageData>
>

export function PlatformBillingPaymentDetailView({
  data,
}: {
  data: PlatformBillingPaymentDetailData
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>/platform/billing/payments/{data.payment.id}</CardDescription>
              <CardTitle>{data.payment.paymentLabel}</CardTitle>
              <CardDescription className="max-w-none">
                Payment detail with invoice issuance, attempt history, and refund eligibility.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href="/platform/billing/subscriptions">Subscriptions</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/billing/refunds">Refunds</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/billing/payments">Back to payments</Link>
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
                  data.payment.paymentStatus === 'SUCCESS'
                    ? 'default'
                    : data.payment.paymentStatus === 'FAILED'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {data.payment.paymentStatusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.payment.amountLabel}</p>
            <p>{data.payment.typeLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.payment.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.payment.workspaceSlug}</p>
            <p>{data.payment.ownerLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Catalog</CardDescription>
            <CardTitle className="text-xl">{data.payment.productName ?? 'Unlinked product'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.payment.planName ?? 'No plan'}</p>
            <p>{data.payment.intervalLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Provider</CardDescription>
            <CardTitle className="text-xl">{data.payment.providerLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.payment.providerPaymentId}</p>
            <p>Captured: {data.payment.capturedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Attempts & Invoices</CardTitle>
            <CardDescription>
              Provider attempts and invoice issuance linked to this payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Attempts</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.attempts.length > 0 ? (
                    data.attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>#{attempt.attemptNumber}</TableCell>
                        <TableCell>{attempt.statusLabel}</TableCell>
                        <TableCell>
                          {attempt.errorCode !== 'N/A'
                            ? `${attempt.errorCode} / ${attempt.errorMessage}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{attempt.createdAtLabel}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No attempts recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Invoices</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.length > 0 ? (
                    data.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">{invoice.providerInvoiceId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.statusLabel}</TableCell>
                        <TableCell>{invoice.amountLabel}</TableCell>
                        <TableCell>{invoice.issuedAtLabel}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No invoices recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Refund Controls</CardTitle>
              <CardDescription>
                Issue a provider refund for the remaining refundable amount on this payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformBillingRefundPanel
                paymentId={data.payment.id}
                defaultAmount={data.payment.refundableAmount}
                amountLabel={data.payment.refundableAmountLabel}
                canRefund={data.payment.canRefund}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Refund History</CardTitle>
              <CardDescription>
                Refund requests already linked to this payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.refunds.length > 0 ? (
                    data.refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>{refund.statusLabel}</TableCell>
                        <TableCell>{refund.amountLabel}</TableCell>
                        <TableCell>{refund.reasonLabel}</TableCell>
                        <TableCell>{refund.processedAtLabel}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No refunds issued yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
