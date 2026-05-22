'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowMenu } from '@/modules/platform/components/catalog/menus/catalog-row-menu';
import {
  deletePlanCatalogAction,
  togglePlanCatalogAction,
} from '@/modules/entitlements/actions/plan-catalog-admin.actions';

type PlanRow = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformPlansListData
  >
>[number];

export function PlatformPlansTable({ rows }: { rows: PlanRow[] }) {
  const columns: ColumnDef<PlanRow>[] = [
    {
      accessorKey: 'name',
      header: 'Plan',
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
      accessorKey: 'sortOrder',
      header: 'Order',
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
      accessorKey: 'isPublic',
      header: 'Visibility',
      cell: ({ row }) => (
        <Badge variant={row.original.isPublic ? 'secondary' : 'outline'}>
          {row.original.isPublic ? 'Public' : 'Internal'}
        </Badge>
      ),
    },
    {
      accessorKey: 'featureCount',
      header: 'Features',
    },
    {
      accessorKey: 'limitCount',
      header: 'Limits',
    },
    {
      accessorKey: 'productCount',
      header: 'Products',
    },
    {
      accessorKey: 'monthlyPrice',
      header: 'Monthly',
      cell: ({ row }) => row.original.monthlyPrice ?? 'Ã¢â‚¬â€',
    },
    {
      accessorKey: 'yearlyPrice',
      header: 'Yearly',
      cell: ({ row }) => row.original.yearlyPrice ?? 'Ã¢â‚¬â€',
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
          entityLabel="Plan"
          entityId={row.original.id}
          idField="planId"
          viewHref={`/platform/catalog/plans/${row.original.id}`}
          editHref={`/platform/catalog/plans/${row.original.id}/edit`}
          isActive={row.original.isActive}
          toggleAction={togglePlanCatalogAction}
          deleteAction={deletePlanCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Plans"
      columns={columns}
      data={rows}
      searchPlaceholder="Search plans by name, key, pricing, or status"
      emptyStateTitle="No plans found"
      emptyStateDescription="Create the first plan to start shaping the commercial catalog."
      primaryAction={{
        label: 'Create Plan',
        href: '/platform/catalog/plans/create',
      }}
    />
  );
}
