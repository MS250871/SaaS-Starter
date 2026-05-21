'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkspaceMediaRow } from '@/modules/media/server/workspace-media-page-data';

export function WorkspaceMediaPanel({
  basePath,
  summary,
  rows,
}: {
  basePath: string;
  summary: {
    total: number;
    ready: number;
    processing: number;
    failed: number;
  };
  rows: WorkspaceMediaRow[];
}) {
  const columns: ColumnDef<WorkspaceMediaRow>[] = [
    {
      accessorKey: 'fileName',
      header: 'Asset',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.fileName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.mimeType}
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
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/media/${row.original.id}`}>View</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="workspace-info-card rounded-2xl border bg-background/85 p-5">
          <p className="workspace-info-label text-sm font-medium">Total assets</p>
          <p className="workspace-info-value mt-3 text-3xl font-semibold">{summary.total}</p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background/85 p-5">
          <p className="workspace-info-label text-sm font-medium">Ready</p>
          <p className="workspace-info-value mt-3 text-3xl font-semibold">{summary.ready}</p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background/85 p-5">
          <p className="workspace-info-label text-sm font-medium">Processing</p>
          <p className="workspace-info-value mt-3 text-3xl font-semibold">{summary.processing}</p>
        </div>
        <div className="workspace-info-card rounded-2xl border bg-background/85 p-5">
          <p className="workspace-info-label text-sm font-medium">Failed</p>
          <p className="workspace-info-value mt-3 text-3xl font-semibold">{summary.failed}</p>
        </div>
      </section>

      <AdminDataTable
        title="Media & Files"
        columns={columns}
        data={rows}
        searchPlaceholder="Search media by file name, mime type, owner, or status"
        emptyStateTitle="No media found"
        emptyStateDescription="Uploads, generated assets, and file attachments will appear here once this workspace starts using them."
        defaultPageSize={10}
        headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
        cardClassName="workspace-info-card border bg-background/85"
      />
    </div>
  );
}
