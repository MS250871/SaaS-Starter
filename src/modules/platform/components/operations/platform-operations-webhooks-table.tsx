'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformWebhookRow } from '@/modules/integration/server/platform-webhook-admin-page-data';
import { requeuePlatformWebhookEventAction } from '@/modules/integration/actions/platform-webhook-admin.actions';
import { PlatformOperationsTaskButton } from '@/modules/platform/components/operations/controls/platform-operations-task-button';

export function PlatformOperationsWebhooksTable({
  rows,
}: {
  rows: PlatformWebhookRow[];
}) {
  const columns: ColumnDef<PlatformWebhookRow>[] = [
    {
      accessorKey: 'eventType',
      header: 'Webhook',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.eventType}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.externalId}</p>
        </div>
      ),
    },
    {
      accessorKey: 'providerLabel',
      header: 'Provider',
    },
    {
      accessorKey: 'ownerLabel',
      header: 'Scope',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.ownerLabel}</p>
          <p className="text-xs text-muted-foreground">{row.original.ownerSubLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'PROCESSED'
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
      accessorKey: 'attempts',
      header: 'Attempts',
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/platform/operations/integrations/webhooks/${row.original.id}`}>
              View
            </Link>
          </Button>
          {['FAILED', 'RECEIVED'].includes(row.original.status) ? (
            <PlatformOperationsTaskButton
              action={requeuePlatformWebhookEventAction}
              fields={{ webhookEventId: row.original.id }}
              label="Requeue"
              pendingLabel="Requeueing..."
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Webhook Events"
      columns={columns}
      data={rows}
      searchPlaceholder="Search webhook events by provider, type, external id, scope, or status"
      emptyStateTitle="No webhook events found"
      emptyStateDescription="Inbound provider events will appear here once billing or integrations start sending callbacks."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
