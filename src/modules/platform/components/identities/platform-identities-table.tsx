'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { togglePlatformIdentityActiveAction } from '@/modules/auth/actions/platform-identity-admin.actions';
import type { PlatformIdentityRow } from '@/modules/auth/server/platform-identity-admin-data';
import { PlatformIdentityRowActions } from '@/modules/platform/components/identities/platform-identity-row-actions';

export function PlatformIdentitiesTable({
  rows,
}: {
  rows: PlatformIdentityRow[];
}) {
  const columns: ColumnDef<PlatformIdentityRow>[] = [
    {
      accessorKey: 'displayName',
      header: 'Identity',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.email ?? row.original.phone ?? 'No primary contact'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'authAccountCount',
      header: 'Auth',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.authAccountCount} accounts</p>
          <p className="text-muted-foreground">
            {row.original.sessionCount} sessions
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'customerCount',
      header: 'Relationships',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.customerCount} customers</p>
          <p className="text-muted-foreground">
            {row.original.membershipCount} memberships
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'platformTeamCount',
      header: 'Platform Team',
      cell: ({ row }) =>
        row.original.platformTeamCount > 0 ? (
          <Badge variant="secondary">Platform operator</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No</span>
        ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? 'N/A',
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
        <PlatformIdentityRowActions
          identityId={row.original.id}
          viewHref={`/platform/identities/${row.original.id}`}
          isActive={row.original.isActive}
          toggleAction={togglePlatformIdentityActiveAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Identities"
      columns={columns}
      data={rows}
      searchPlaceholder="Search identities by name, email, phone, or operator status"
      emptyStateTitle="No identities found"
      emptyStateDescription="Identities will appear here as soon as authentication records are created."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={[
        {
          label: 'Customers',
          href: '/platform/identities/customers',
          variant: 'outline',
        },
        {
          label: 'Accounts & Auth',
          href: '/platform/identities/accounts',
          variant: 'outline',
        },
        {
          label: 'Sessions & OTP',
          href: '/platform/identities/sessions',
          variant: 'outline',
        },
      ]}
    />
  );
}
