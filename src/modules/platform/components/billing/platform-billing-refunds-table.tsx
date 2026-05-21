'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminDataTable } from '@/components/data-table/admin-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PlatformBillingRefundRow } from '@/modules/billing/server/platform-billing-admin-page-data'

export function PlatformBillingRefundsTable({
  rows,
}: {
  rows: PlatformBillingRefundRow[]
}) {
  const columns: ColumnDef<PlatformBillingRefundRow>[] = [
    {
      accessorKey: 'paymentLabel',
      header: 'Refund',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.paymentLabel}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.id}
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
      accessorKey: 'reasonLabel',
      header: 'Reason',
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'SUCCESS'
              ? 'default'
              : row.original.status === 'FAILED'
                ? 'outline'
                : 'secondary'
          }
        >
          {row.original.statusLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'amountLabel',
      header: 'Amount',
    },
    {
      accessorKey: 'providerRefundId',
      header: 'Provider Refund',
    },
    {
      accessorKey: 'processedAtLabel',
      header: 'Processed',
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
          <Link href={`/platform/billing/refunds/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ]

  return (
    <AdminDataTable
      title="Refunds"
      columns={columns}
      data={rows}
      searchPlaceholder="Search refunds by workspace, payment, status, reason, or provider refund id"
      emptyStateTitle="No refunds found"
      emptyStateDescription="Refunds will appear here once reversals or adjustment refunds are issued."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={[
        {
          label: 'Subscriptions',
          href: '/platform/billing/subscriptions',
          variant: 'outline',
        },
        {
          label: 'Payments & Invoices',
          href: '/platform/billing/payments',
          variant: 'outline',
        },
      ]}
    />
  )
}
