'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { revokePlatformSessionAction } from '@/modules/auth/actions/platform-identity-admin.actions';
import type { PlatformSessionRow } from '@/modules/auth/server/platform-identity-admin-data';
import { PlatformSessionRowActions } from '@/modules/platform/components/identities/platform-session-row-actions';

export function PlatformSessionsTable({
  rows,
}: {
  rows: PlatformSessionRow[];
}) {
  const columns: ColumnDef<PlatformSessionRow>[] = [
    {
      accessorKey: 'displayName',
      header: 'Identity',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.identityEmail ?? 'No email'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'contextLabel',
      header: 'Context',
    },
    {
      accessorKey: 'roleLabel',
      header: 'Role',
    },
    {
      accessorKey: 'deviceLabel',
      header: 'Device',
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.statusLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'expiresAtLabel',
      header: 'Expires',
    },
    {
      accessorKey: 'lastSeenAtLabel',
      header: 'Last Seen',
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
        <PlatformSessionRowActions
          sessionId={row.original.id}
          identityHref={`/platform/identities/${row.original.identityId}`}
          canRevoke={row.original.isActive}
          revokeAction={revokePlatformSessionAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Sessions"
      columns={columns}
      data={rows}
      searchPlaceholder="Search sessions by identity, context, role, or device"
      emptyStateTitle="No sessions found"
      emptyStateDescription="Sessions will appear here as soon as users sign in."
    />
  );
}
