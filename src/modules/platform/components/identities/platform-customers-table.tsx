'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformCustomerRow } from '@/modules/customer/server/platform-customer-admin-data';
import { PlatformLinkGroup } from '@/modules/platform/components/links/platform-link-group';

export function PlatformCustomersTable({
  rows,
}: {
  rows: PlatformCustomerRow[];
}) {
  const columns: ColumnDef<PlatformCustomerRow>[] = [
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.identityEmail ?? row.original.identityPhone ?? 'No contact'}
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
      accessorKey: 'externalId',
      header: 'External ID',
      cell: ({ row }) => row.original.externalId ?? 'N/A',
    },
    {
      accessorKey: 'identityIsActive',
      header: 'Identity',
      cell: ({ row }) => (
        <Badge variant={row.original.identityIsActive ? 'default' : 'outline'}>
          {row.original.identityIsActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'workspaceIsActive',
      header: 'Workspace',
      cell: ({ row }) => (
        <Badge variant={row.original.workspaceIsActive ? 'secondary' : 'outline'}>
          {row.original.workspaceIsActive ? 'Active' : 'Inactive'}
        </Badge>
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
        <PlatformLinkGroup
          label="customer"
          actions={[
            {
              label: 'View identity',
              href: `/platform/identities/${row.original.identityId}`,
            },
            {
              label: 'View workspace',
              href: `/platform/workspaces/${row.original.workspaceId}`,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Customers"
      columns={columns}
      data={rows}
      searchPlaceholder="Search customers by name, email, workspace, or external ID"
      emptyStateTitle="No customers found"
      emptyStateDescription="Customer records will appear here when workspace end-users are provisioned."
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
