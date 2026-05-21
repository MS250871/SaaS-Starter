'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformOutboxRow } from '@/modules/jobs/server/platform-outbox-admin-page-data';
import { requeuePlatformOutboxEventAction } from '@/modules/jobs/actions/platform-outbox-admin.actions';
import { PlatformOperationsAsyncButton } from '@/modules/platform/components/operations/platform-operations-async-button';

export function PlatformOperationsOutboxTable({
  rows,
}: {
  rows: PlatformOutboxRow[];
}) {
  const columns: ColumnDef<PlatformOutboxRow>[] = [
    {
      accessorKey: 'eventType',
      header: 'Outbox Event',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.eventType}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.processingKey}</p>
        </div>
      ),
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
            row.original.status === 'DONE'
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
      accessorKey: 'scheduledAtLabel',
      header: 'Scheduled',
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
            <Link href={`/platform/operations/integrations/outbox/${row.original.id}`}>View</Link>
          </Button>
          {['FAILED', 'PENDING'].includes(row.original.status) ? (
            <PlatformOperationsAsyncButton
              action={requeuePlatformOutboxEventAction}
              fields={{ outboxEventId: row.original.id }}
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
      title="Outbox Events"
      columns={columns}
      data={rows}
      searchPlaceholder="Search outbox events by type, processing key, scope, job id, or status"
      emptyStateTitle="No outbox events found"
      emptyStateDescription="Queued operational work will appear here as notifications and other jobs are scheduled."
      defaultPageSize={8}
    />
  );
}
