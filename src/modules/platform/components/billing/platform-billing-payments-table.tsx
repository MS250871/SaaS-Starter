'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminDataTable } from '@/components/data-table/admin-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PlatformBillingPaymentRow } from '@/modules/billing/server/platform-billing-admin-page-data'

export function PlatformBillingPaymentsTable({
  rows,
  title = 'Payments & Invoices',
  description,
  searchPlaceholder = 'Search payments by workspace, owner, product, provider ids, or status',
  emptyStateTitle = 'No payments found',
  emptyStateDescription = 'Payments and invoices will appear here once billing activity starts.',
  secondaryActions = [
    {
      label: 'Subscriptions',
      href: '/platform/billing/subscriptions',
      variant: 'outline' as const,
    },
    {
      label: 'One-Time Purchases',
      href: '/platform/billing/purchases',
      variant: 'outline' as const,
    },
    {
      label: 'Refunds',
      href: '/platform/billing/refunds',
      variant: 'outline' as const,
    },
  ],
}: {
  rows: PlatformBillingPaymentRow[]
  title?: string
  description?: string
  searchPlaceholder?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  secondaryActions?: Array<{
    label: string
    href: string
    variant?: 'default' | 'outline' | 'secondary'
  }>
}) {
  const columns: ColumnDef<PlatformBillingPaymentRow>[] = [
    {
      accessorKey: 'paymentLabel',
      header: 'Payment',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.paymentLabel}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.paymentSubLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'workspaceName',
      header: 'Workspace',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.workspaceName}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.workspaceSlug}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'ownerLabel',
      header: 'Billing Owner',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.ownerLabel}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.ownerSubLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'paymentStatusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              row.original.paymentStatus === 'SUCCESS'
                ? 'default'
                : row.original.paymentStatus === 'FAILED'
                  ? 'outline'
                  : 'secondary'
            }
          >
            {row.original.paymentStatusLabel}
          </Badge>
          {row.original.subscriptionStatusLabel ? (
            <Badge variant="outline">{row.original.subscriptionStatusLabel}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'amountLabel',
      header: 'Amount',
    },
    {
      accessorKey: 'invoiceLabel',
      header: 'Invoices',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.invoiceLabel}</p>
          <p className="text-muted-foreground">{row.original.refundLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'capturedAtLabel',
      header: 'Captured',
    },
    {
      accessorKey: 'createdAtLabel',
      header: 'Created',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/platform/billing/payments/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ]

  return (
    <AdminDataTable
      title={title}
      description={description}
      columns={columns}
      data={rows}
      searchPlaceholder={searchPlaceholder}
      emptyStateTitle={emptyStateTitle}
      emptyStateDescription={emptyStateDescription}
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={secondaryActions}
    />
  )
}
