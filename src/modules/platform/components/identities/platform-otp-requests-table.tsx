'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformOtpRequestRow } from '@/modules/auth/server/platform-identity-admin-data';
import { PlatformLinkGroup } from '@/modules/platform/components/links/platform-link-group';

export function PlatformOtpRequestsTable({
  rows,
}: {
  rows: PlatformOtpRequestRow[];
}) {
  const columns: ColumnDef<PlatformOtpRequestRow>[] = [
    {
      accessorKey: 'displayName',
      header: 'Identity',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.displayName}</p>
          <p className="text-xs text-muted-foreground">{row.original.accountLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'workspaceLabel',
      header: 'Workspace',
    },
    {
      accessorKey: 'purposeLabel',
      header: 'Purpose',
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.statusLabel === 'Pending verification'
              ? 'default'
              : 'outline'
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
      accessorKey: 'resendCount',
      header: 'Resends',
    },
    {
      accessorKey: 'expiresAtLabel',
      header: 'Expires',
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
        <PlatformLinkGroup
          label="otp request"
          actions={[
            {
              label: 'View identity',
              href: `/platform/identities/${row.original.identityId}`,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="OTP Requests"
      columns={columns}
      data={rows}
      searchPlaceholder="Search OTP requests by identity, workspace, purpose, or account"
      emptyStateTitle="No OTP requests found"
      emptyStateDescription="Outstanding OTP verification requests will appear here when flows are in progress."
    />
  );
}
