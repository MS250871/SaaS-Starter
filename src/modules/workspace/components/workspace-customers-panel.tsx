import Link from 'next/link';
import { EyeIcon, PlusIcon, UploadIcon } from 'lucide-react';

import {
  WorkspaceDataTable,
  type WorkspaceTableColumn,
} from '@/components/data-table/workspace-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type CustomerListItem = {
  id: string;
  name: string;
  email: string | null;
  externalId: string | null;
  createdAt: string;
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
  page,
  pageSize,
  totalItems,
  totalPages,
  filters,
}: {
  basePath: string;
  customers: CustomerListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  filters: {
    query: string;
    source: string;
  };
}) {
  const columns: WorkspaceTableColumn<CustomerListItem>[] = [
    {
      id: 'name',
      header: 'Customer',
      cell: (customer) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{customer.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {customer.email ?? 'No email'}
          </p>
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: (customer) =>
        customer.externalId ? (
          <div className="space-y-1">
            <Badge variant="outline">External Sync</Badge>
            <p className="text-xs text-muted-foreground">
              {customer.externalId}
            </p>
          </div>
        ) : (
          <Badge variant="secondary">Native</Badge>
        ),
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: (customer) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(customer.createdAt)}
        </span>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (customer) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/customers/${customer.id}`}>
            <EyeIcon className="mr-2 size-4" />
            Details
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <WorkspaceDataTable
      title="Customers"
      description="Manage workspace customers with a reusable table surface built for filters, pagination, and future SaaS-specific expansion."
      basePath={`${basePath}/customers`}
      actions={[
        {
          label: 'Create Customer',
          href: `${basePath}/customers/create`,
          icon: <PlusIcon className="mr-2 size-4" />,
        },
        {
          label: 'Bulk Create',
          href: `${basePath}/customers/bulk-create`,
          variant: 'outline',
          icon: <UploadIcon className="mr-2 size-4" />,
        },
      ]}
      filters={[
        {
          key: 'q',
          label: 'Search',
          type: 'search',
          placeholder: 'Search by customer name, email, or external ID',
          value: filters.query,
        },
        {
          key: 'source',
          label: 'Source',
          type: 'select',
          value: filters.source,
          options: [
            { label: 'All customers', value: 'all' },
            { label: 'Native', value: 'native' },
            { label: 'External sync', value: 'external' },
          ],
        },
      ]}
      columns={columns}
      rows={customers}
      rowKey={(customer) => customer.id}
      emptyStateTitle="No customers found"
      emptyStateDescription="Try adjusting the filters or create the first customer for this workspace."
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      query={{
        q: filters.query || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
      }}
    />
  );
}
