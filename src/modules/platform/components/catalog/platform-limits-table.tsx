'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowMenu } from '@/modules/platform/components/catalog/menus/catalog-row-menu';
import {
  deleteLimitCatalogAction,
  toggleLimitCatalogAction,
} from '@/modules/entitlements/actions/limit-catalog-admin.actions';

type LimitRow = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformLimitsListData
  >
>[number];

export function PlatformLimitsTable({ rows }: { rows: LimitRow[] }) {
  const columns: ColumnDef<LimitRow>[] = [
    {
      accessorKey: 'name',
      header: 'Limit',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.key}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => row.original.unit || 'Ã¢â‚¬â€',
    },
    {
      accessorKey: 'sortOrder',
      header: 'Order',
    },
    {
      accessorKey: 'planCount',
      header: 'Plan Usage',
    },
    {
      accessorKey: 'overrideCount',
      header: 'Overrides',
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
      accessorKey: 'updatedAtLabel',
      header: 'Updated',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <CatalogRowMenu
          entityLabel="Limit"
          entityId={row.original.id}
          idField="limitId"
          viewHref={`/platform/catalog/limits/${row.original.id}`}
          editHref={`/platform/catalog/limits/${row.original.id}/edit`}
          isActive={row.original.isActive}
          toggleAction={toggleLimitCatalogAction}
          deleteAction={deleteLimitCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Limits"
      columns={columns}
      data={rows}
      searchPlaceholder="Search limits by name, key, or unit"
      emptyStateTitle="No limits found"
      emptyStateDescription="Create the first limit definition to start governing plan quotas."
      primaryAction={{
        label: 'Create Limit',
        href: '/platform/catalog/limits/create',
      }}
    />
  );
}
