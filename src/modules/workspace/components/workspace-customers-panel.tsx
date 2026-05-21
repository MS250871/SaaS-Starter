'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon } from 'lucide-react';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  externalId: string | null;
  sourceLabel: string;
  createdAt: string;
  createdAtLabel: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Calcutta',
  }).format(new Date(value));
}

export function WorkspaceCustomersPanel({
  basePath,
  customers,
}: {
  basePath: string;
  customers: CustomerListItem[];
}) {
  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {row.original.email ?? 'No email'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'sourceLabel',
      header: 'Source',
      cell: ({ row }) =>
        row.original.externalId ? (
          <div className="space-y-1">
            <Badge variant="outline">{row.original.sourceLabel}</Badge>
            <p className="text-xs text-muted-foreground">
              {row.original.externalId}
            </p>
          </div>
        ) : (
          <Badge variant="secondary">{row.original.sourceLabel}</Badge>
        ),
    },
    {
      accessorKey: 'createdAtLabel',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/customers/${row.original.id}`}>
              <EyeIcon className="mr-2 size-4" />
              Details
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Customers"
      columns={columns}
      data={customers}
      searchPlaceholder="Search customers by name, email, external ID, or source"
      emptyStateTitle="No customers found"
      emptyStateDescription="Create the first customer for this workspace to start building the directory."
      primaryAction={{
        label: 'Create Customer',
        href: `${basePath}/customers/create`,
      }}
      secondaryActions={[
        {
          label: 'Bulk Create',
          href: `${basePath}/customers/bulk-create`,
          variant: 'outline',
        },
      ]}
      defaultPageSize={10}
      headerTextClassName="lg:max-w-[32rem] xl:max-w-[36rem]"
      actionsClassName="lg:flex-nowrap"
    />
  );
}
