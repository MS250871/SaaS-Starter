'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformNotificationRow } from '@/modules/notifications/server/platform-notifications-admin-page-data';

export function PlatformOperationsNotificationsTable({
  rows,
}: {
  rows: PlatformNotificationRow[];
}) {
  const columns: ColumnDef<PlatformNotificationRow>[] = [
    {
      accessorKey: 'title',
      header: 'Notification',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.typeLabel}
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
      accessorKey: 'recipientLabel',
      header: 'Recipient',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.recipientLabel}</p>
          <p className="text-xs text-muted-foreground">{row.original.recipientSubLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'targetTypeLabel',
      header: 'Target',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{row.original.targetTypeLabel}</Badge>
          <Badge variant={row.original.isRead ? 'secondary' : 'default'}>
            {row.original.readLabel}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'latestDeliveryStatusLabel',
      header: 'Delivery',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.latestDeliveryStatusLabel}</p>
          <p className="text-muted-foreground">
            {row.original.deliveryCount} deliveries
          </p>
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
          <Link href={`/platform/operations/notifications/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Notifications"
      columns={columns}
      data={rows}
      searchPlaceholder="Search notifications by title, type, workspace, recipient, or delivery status"
      emptyStateTitle="No notifications found"
      emptyStateDescription="Notifications will appear here once platform or workspace messaging starts."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
