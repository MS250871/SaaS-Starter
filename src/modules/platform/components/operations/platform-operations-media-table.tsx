'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PlatformMediaRow } from '@/modules/media/server/platform-media-admin-page-data';

export function PlatformOperationsMediaTable({
  rows,
}: {
  rows: PlatformMediaRow[];
}) {
  const columns: ColumnDef<PlatformMediaRow>[] = [
    {
      accessorKey: 'fileName',
      header: 'Asset',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.fileName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.mimeType}</p>
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
      header: 'Owner',
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
            row.original.status === 'READY'
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
      accessorKey: 'sizeLabel',
      header: 'Size',
    },
    {
      accessorKey: 'attachmentCount',
      header: 'Usage',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.attachmentCount} attachments</p>
          <p className="text-muted-foreground">{row.original.jobCount} jobs</p>
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
          <Link href={`/platform/operations/media/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Media & Files"
      columns={columns}
      data={rows}
      searchPlaceholder="Search media by file name, mime type, workspace, owner, or status"
      emptyStateTitle="No media found"
      emptyStateDescription="Media records will appear here once uploads or generated assets start flowing through the app."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
