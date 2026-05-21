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
import type { getPlatformBillingRefundDetailPageData } from '@/modules/billing/server/platform-billing-admin-page-data'

type PlatformBillingRefundDetailData = Awaited<
  ReturnType<typeof getPlatformBillingRefundDetailPageData>
>

export function PlatformBillingRefundDetailView({
  data,
}: {
  data: PlatformBillingRefundDetailData
}) {
  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 lg:max-w-[34rem] xl:max-w-[38rem]">
              <CardDescription>/platform/billing/refunds/{data.refund.id}</CardDescription>
              <CardTitle>{data.refund.amountLabel}</CardTitle>
              <CardDescription className="max-w-none">
                Refund detail spanning the original payment, provider state, and processing timestamps.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Button asChild variant="outline">
                <Link href={`/platform/billing/payments/${data.refund.paymentId}`}>Open payment</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/platform/billing/refunds">Back to refunds</Link>
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
                  data.refund.status === 'SUCCESS'
                    ? 'default'
                    : data.refund.status === 'FAILED'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {data.refund.statusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.refund.reasonLabel}</p>
            <p>{data.refund.providerLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Workspace</CardDescription>
            <CardTitle className="text-xl">{data.refund.workspaceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.refund.workspaceSlug}</p>
            <p>{data.refund.ownerLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Original payment</CardDescription>
            <CardTitle className="text-xl">{data.refund.paymentLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.refund.paymentTypeLabel}</p>
            <p>{data.refund.paymentStatusLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardDescription>Provider refs</CardDescription>
            <CardTitle className="text-xl">{data.refund.providerRefundId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{data.refund.providerPaymentId}</p>
            <p>Processed: {data.refund.processedAtLabel}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Refund Overview</CardTitle>
            <CardDescription>
              Reason, notes, catalog context, and timestamps for this refund request.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Refund id</p>
              <p className="font-mono text-sm uppercase tracking-[0.14em]">{data.refund.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment id</p>
              <p className="font-mono text-sm uppercase tracking-[0.14em]">{data.refund.paymentId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium">{data.refund.planName ?? 'No plan'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{data.refund.productName ?? 'Unlinked product'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{data.refund.notes || 'No notes recorded.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
            <CardDescription>
              Operational timing for the refund lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Created: {data.refund.createdAtLabel}</p>
            <p>Updated: {data.refund.updatedAtLabel}</p>
            <p>Processed: {data.refund.processedAtLabel}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
