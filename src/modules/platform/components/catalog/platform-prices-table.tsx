'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowMenu } from '@/modules/platform/components/catalog/menus/catalog-row-menu';
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
  const [priceRows, setPriceRows] = useState(rows);
  const columns: ColumnDef<PriceRow>[] = [
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.productName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.planName} Ã‚Â· {row.original.productCode}
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
      cell: ({ row }) => row.original.providerPriceId || 'Ã¢â‚¬â€',
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
        <CatalogRowMenu
          entityLabel="Price"
          entityId={row.original.id}
          idField="priceId"
          viewHref={`/platform/catalog/prices/${row.original.id}`}
          editHref={`/platform/catalog/prices/${row.original.id}/edit`}
          isActive={row.original.isActive}
          onToggleSuccess={(priceId, next) => {
            setPriceRows((current) =>
              current.map((entry) =>
                entry.id === priceId
                  ? { ...entry, isActive: next.isActive }
                  : entry,
              ),
            );
          }}
          onDeleteSuccess={(priceId) => {
            setPriceRows((current) =>
              current.filter((entry) => entry.id !== priceId),
            );
          }}
          toggleAction={togglePriceCatalogAction}
          deleteAction={deletePriceCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Prices"
      columns={columns}
      data={priceRows}
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
