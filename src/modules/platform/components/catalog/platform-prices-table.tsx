'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowActions } from '@/modules/platform/components/catalog/catalog-row-actions';
import {
  deletePriceCatalogAction,
  togglePriceCatalogAction,
} from '@/modules/billing/actions/price-catalog-admin.actions';

type PriceRow = Awaited<
  ReturnType<
    typeof import('@/modules/billing/server/platform-billing-catalog-page-data').getPlatformPricesListData
  >
>[number];

function formatInterval(interval: string) {
  if (interval === 'MONTHLY') {
    return 'Monthly';
  }

  if (interval === 'YEARLY') {
    return 'Yearly';
  }

  return 'One-time';
}

export function PlatformPricesTable({ rows }: { rows: PriceRow[] }) {
  const columns: ColumnDef<PriceRow>[] = [
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.productName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.planName} · {row.original.productCode}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'amountLabel',
      header: 'Amount',
    },
    {
      accessorKey: 'interval',
      header: 'Interval',
      cell: ({ row }) => formatInterval(row.original.interval),
    },
    {
      accessorKey: 'productType',
      header: 'Product Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.productType === 'SUBSCRIPTION'
            ? 'Subscription'
            : 'One-time'}
        </Badge>
      ),
    },
    {
      accessorKey: 'providerPriceId',
      header: 'Provider Ref',
      cell: ({ row }) => row.original.providerPriceId || '—',
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
      accessorKey: 'createdAtLabel',
      header: 'Created',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <CatalogRowActions
          entityLabel="Price"
          entityId={row.original.id}
          idField="priceId"
          viewHref={`/platform/catalog/prices/${row.original.id}`}
          editHref={`/platform/catalog/prices/${row.original.id}/edit`}
          isActive={row.original.isActive}
          toggleAction={togglePriceCatalogAction}
          deleteAction={deletePriceCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Prices"
      description="Control recurring and one-time pricing entries, provider references, interval variants, and catalog activation state."
      columns={columns}
      data={rows}
      searchPlaceholder="Search prices by product, plan, amount, or provider reference"
      emptyStateTitle="No prices found"
      emptyStateDescription="Create the first price to make a product billable."
      primaryAction={{
        label: 'Create Price',
        href: '/platform/catalog/prices/create',
      }}
    />
  );
}
