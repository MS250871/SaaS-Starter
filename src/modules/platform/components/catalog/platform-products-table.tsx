'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowActions } from '@/modules/platform/components/catalog/catalog-row-actions';
import {
  deleteProductCatalogAction,
  toggleProductCatalogAction,
} from '@/modules/billing/actions/product-catalog-admin.actions';

type ProductRow = Awaited<
  ReturnType<
    typeof import('@/modules/billing/server/platform-billing-catalog-page-data').getPlatformProductsListData
  >
>[number];

export function PlatformProductsTable({ rows }: { rows: ProductRow[] }) {
  const columns: ColumnDef<ProductRow>[] = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.code}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'planName',
      header: 'Plan',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time'}
        </Badge>
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
      accessorKey: 'activePriceCount',
      header: 'Active Prices',
    },
    {
      accessorKey: 'priceCount',
      header: 'All Prices',
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
        <CatalogRowActions
          entityLabel="Product"
          entityId={row.original.id}
          idField="productId"
          viewHref={`/platform/catalog/products/${row.original.id}`}
          editHref={`/platform/catalog/products/${row.original.id}/edit`}
          isActive={row.original.isActive}
          toggleAction={toggleProductCatalogAction}
          deleteAction={deleteProductCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Products"
      columns={columns}
      data={rows}
      searchPlaceholder="Search products by name, code, plan, or type"
      emptyStateTitle="No products found"
      emptyStateDescription="Create the first product to connect plans to billing offers."
      primaryAction={{
        label: 'Create Product',
        href: '/platform/catalog/products/create',
      }}
    />
  );
}
