'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { CatalogRowMenu } from '@/modules/platform/components/catalog/menus/catalog-row-menu';
import {
  deleteFeatureCatalogAction,
  toggleFeatureCatalogAction,
} from '@/modules/entitlements/actions/feature-catalog-admin.actions';

type FeatureRow = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformFeaturesListData
  >
>[number];

export function PlatformFeaturesTable({ rows }: { rows: FeatureRow[] }) {
  const [featureRows, setFeatureRows] = useState(rows);
  const columns: ColumnDef<FeatureRow>[] = [
    {
      accessorKey: 'name',
      header: 'Feature',
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
      accessorKey: 'category',
      header: 'Category',
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
          entityLabel="Feature"
          entityId={row.original.id}
          idField="featureId"
          viewHref={`/platform/catalog/features/${row.original.id}`}
          editHref={`/platform/catalog/features/${row.original.id}/edit`}
          isActive={row.original.isActive}
          onToggleSuccess={(featureId, next) => {
            setFeatureRows((current) =>
              current.map((entry) =>
                entry.id === featureId
                  ? { ...entry, isActive: next.isActive }
                  : entry,
              ),
            );
          }}
          onDeleteSuccess={(featureId) => {
            setFeatureRows((current) =>
              current.filter((entry) => entry.id !== featureId),
            );
          }}
          toggleAction={toggleFeatureCatalogAction}
          deleteAction={deleteFeatureCatalogAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Features"
      columns={columns}
      data={featureRows}
      searchPlaceholder="Search features by name, key, or category"
      emptyStateTitle="No features found"
      emptyStateDescription="Create the first feature to start shaping plan capabilities."
      primaryAction={{
        label: 'Create Feature',
        href: '/platform/catalog/features/create',
      }}
    />
  );
}
