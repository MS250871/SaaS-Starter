'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontalIcon } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { AdminDataTable } from '@/components/data-table/admin-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActionToast } from '@/hooks/use-action-toast'
import { type ApiResponse } from '@/lib/http/create-action'
import { schedulePlatformSubscriptionCancellationAction } from '@/modules/billing/actions/platform-billing-admin.actions'
import type { PlatformBillingSubscriptionRow } from '@/modules/billing/server/platform-billing-admin-page-data'

type ActionResult = {
  successMessage?: string
}

function SubscriptionRowActions({
  row,
  onScheduleCancellationSuccess,
}: {
  row: PlatformBillingSubscriptionRow
  onScheduleCancellationSuccess?: (subscriptionId: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const { showActionError, showActionSuccess } = useActionToast()

  const runScheduleCancellation = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('subscriptionId', row.id)

      const response: ApiResponse<ActionResult> =
        await schedulePlatformSubscriptionCancellationAction(formData)

      if (!response.success) {
        showActionError(response.error)
        return
      }

      showActionSuccess(
        response.data.successMessage,
        'Subscription cancellation was scheduled.',
      )
      onScheduleCancellationSuccess?.(row.id)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open subscription actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/platform/billing/subscriptions/${row.id}`}>View</Link>
        </DropdownMenuItem>
        {row.cancelAtPeriodEnd || !['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'].includes(row.status) ? null : (
          <DropdownMenuItem onClick={runScheduleCancellation}>
            Cancel at cycle end
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PlatformBillingSubscriptionsTable({
  rows,
}: {
  rows: PlatformBillingSubscriptionRow[]
}) {
  const [subscriptionRows, setSubscriptionRows] = useState(rows)
  const columns: ColumnDef<PlatformBillingSubscriptionRow>[] = [
    {
      accessorKey: 'planName',
      header: 'Subscription',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.planName}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.productCode}
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
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              ['ACTIVE', 'TRIALING'].includes(row.original.status)
                ? 'default'
                : row.original.status === 'PAST_DUE'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {row.original.statusLabel}
          </Badge>
          {row.original.cancelAtPeriodEnd ? (
            <Badge variant="secondary">Cancel scheduled</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'amountLabel',
      header: 'Value',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.amountLabel}</p>
          <p className="text-muted-foreground">{row.original.intervalLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'cycleLabel',
      header: 'Billing Cycle',
    },
    {
      accessorKey: 'paymentCount',
      header: 'Payments',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.paymentCount} linked payments</p>
          <p className="text-muted-foreground">{row.original.providerLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'updatedAtLabel',
      header: 'Updated',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <SubscriptionRowActions
          row={row.original}
          onScheduleCancellationSuccess={(subscriptionId) => {
            setSubscriptionRows((current) =>
              current.map((entry) =>
                entry.id === subscriptionId
                  ? { ...entry, cancelAtPeriodEnd: true }
                  : entry,
              ),
            )
          }}
        />
      ),
    },
  ]

  return (
    <AdminDataTable
      title="Subscriptions"
      columns={columns}
      data={subscriptionRows}
      searchPlaceholder="Search subscriptions by plan, workspace, owner, product code, or provider id"
      emptyStateTitle="No subscriptions found"
      emptyStateDescription="Subscriptions will appear here once paid or trial billing starts."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={[
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
  )
}
