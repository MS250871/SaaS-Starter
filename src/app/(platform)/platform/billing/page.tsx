import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformBillingPaymentsTable } from '@/modules/platform/components/billing/platform-billing-payments-table'
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin'
import {
  getPlatformBillingOverviewData,
  getPlatformBillingPaymentsPageData,
  getPlatformBillingPurchasesPageData,
} from '@/modules/billing/server/platform-billing-admin-page-data'

export default async function PlatformBillingPage() {
  await requirePlatformPermission('platformBilling.read')

  const [overview, payments, purchases] = await Promise.all([
    getPlatformBillingOverviewData(),
    getPlatformBillingPaymentsPageData(),
    getPlatformBillingPurchasesPageData(),
  ])

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {overview.resources.map((resource) => (
          <Link key={resource.href} href={resource.href}>
            <Card className="h-full border-border/70 bg-background/85 transition-colors hover:border-accent/50">
              <CardHeader>
                <CardTitle>{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-3xl font-semibold">{resource.totalCount}</p>
                  <p className="text-sm text-muted-foreground">{resource.stats}</p>
                </div>
                <p className="text-sm font-medium text-accent">Open billing view</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <PlatformBillingPaymentsTable
        rows={payments.rows.slice(0, 12)}
        title="Recent Payments"
      />

      <PlatformBillingPaymentsTable
        rows={purchases.rows.slice(0, 12)}
        title="Recent One-Time Purchases"
        searchPlaceholder="Search one-time purchases by workspace, owner, product, provider ids, or status"
        emptyStateTitle="No one-time purchases found"
        emptyStateDescription="One-time purchases will appear here once direct commercial transactions start."
        secondaryActions={[
          {
            label: 'All Purchases',
            href: '/platform/billing/purchases',
            variant: 'outline',
          },
          {
            label: 'Payments & Invoices',
            href: '/platform/billing/payments',
            variant: 'outline',
          },
          {
            label: 'Refunds',
            href: '/platform/billing/refunds',
            variant: 'outline',
          },
        ]}
      />
    </div>
  )
}
