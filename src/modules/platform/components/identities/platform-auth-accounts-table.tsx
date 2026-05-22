'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformAuthAccountRow } from '@/modules/auth/server/platform-identity-admin-data';
import { PlatformLinkGroup } from '@/modules/platform/components/links/platform-link-group';

export function PlatformAuthAccountsTable({
  rows,
}: {
  rows: PlatformAuthAccountRow[];
}) {
  const columns: ColumnDef<PlatformAuthAccountRow>[] = [
    {
      accessorKey: 'value',
      header: 'Account',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.value}</p>
          <p className="text-xs text-muted-foreground">{row.original.typeLabel}</p>
        </div>
      ),
    },
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
      accessorKey: 'isVerified',
      header: 'Verification',
      cell: ({ row }) => (
        <Badge variant={row.original.isVerified ? 'default' : 'outline'}>
          {row.original.isVerified ? 'Verified' : 'Pending'}
        </Badge>
      ),
    },
    {
      accessorKey: 'passwordLabel',
      header: 'Password',
    },
    {
      accessorKey: 'verifiedAtLabel',
      header: 'Verified At',
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
        <PlatformLinkGroup
          label="auth account"
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
      title="Accounts & Auth"
      columns={columns}
      data={rows}
      searchPlaceholder="Search accounts by email, phone, identity, or verification state"
      emptyStateTitle="No auth accounts found"
      emptyStateDescription="Auth accounts will appear here when login identifiers are provisioned."
      secondaryActions={[
        {
          label: 'All Identities',
          href: '/platform/identities',
          variant: 'outline',
        },
      ]}
    />
  );
}
