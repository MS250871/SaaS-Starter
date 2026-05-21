'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformSupportTicketRow } from '@/modules/support/server/platform-support-admin-page-data';

export function PlatformOperationsSupportTable({
  rows,
  title = 'Support',
  description,
}: {
  rows: PlatformSupportTicketRow[];
  title?: string;
  description?: string | undefined;
}) {
  const columns: ColumnDef<PlatformSupportTicketRow>[] = [
    {
      accessorKey: 'title',
      header: 'Ticket',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.requesterLabel} - {row.original.requesterSubLabel}
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
      accessorKey: 'contextTypeLabel',
      header: 'Context',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant={row.original.contextType === 'PLATFORM' ? 'default' : 'outline'}>
            {row.original.contextTypeLabel}
          </Badge>
          <Badge variant="secondary">{row.original.priorityLabel}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'closed' || row.original.status === 'resolved'
              ? 'outline'
              : row.original.status === 'in_progress'
                ? 'secondary'
                : 'default'
          }
        >
          {row.original.statusLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'assigneeLabel',
      header: 'Assignee',
    },
    {
      accessorKey: 'messageCount',
      header: 'Thread',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.messageCount} messages</p>
          <p className="text-muted-foreground">{row.original.updatedAtLabel}</p>
        </div>
      ),
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
          <Link href={`/platform/operations/support/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminDataTable
      title={title}
      description={description}
      columns={columns}
      data={rows}
      searchPlaceholder="Search support by title, workspace, requester, assignee, or status"
      emptyStateTitle="No support tickets found"
      emptyStateDescription="Support tickets and platform escalations will appear here once activity starts."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
