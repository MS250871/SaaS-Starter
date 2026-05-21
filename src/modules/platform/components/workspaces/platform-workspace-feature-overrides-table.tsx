'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformWorkspaceFeatureOverrideRow } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';
import { PlatformWorkspaceLinkActions } from '@/modules/platform/components/workspaces/platform-workspace-link-actions';

export function PlatformWorkspaceFeatureOverridesTable({
  rows,
  canCreateOverride,
  canEditOverride,
}: {
  rows: PlatformWorkspaceFeatureOverrideRow[];
  canCreateOverride: boolean;
  canEditOverride: boolean;
}) {
  const columns: ColumnDef<PlatformWorkspaceFeatureOverrideRow>[] = [
    {
      accessorKey: 'featureName',
      header: 'Feature',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.featureName}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.featureKey}
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
      accessorKey: 'featureCategory',
      header: 'Category',
      cell: ({ row }) => row.original.featureCategory ?? 'N/A',
    },
    {
      accessorKey: 'statusLabel',
      header: 'Override',
      cell: ({ row }) => (
        <Badge variant={row.original.isEnabled ? 'default' : 'outline'}>
          {row.original.statusLabel}
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
        <PlatformWorkspaceLinkActions
          label="feature override"
          actions={[
            ...(canEditOverride
              ? [
                  {
                    label: 'Manage workspace features',
                    href: `/platform/workspaces/overrides/features/create?workspaceId=${row.original.workspaceId}`,
                  },
                ]
              : []),
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
      title="Feature Overrides"
      columns={columns}
      data={rows}
      searchPlaceholder="Search feature overrides by workspace, feature, or category"
      emptyStateTitle="No feature overrides found"
      emptyStateDescription="Overrides will appear here when workspaces receive plan exceptions."
      primaryAction={
        canCreateOverride
          ? {
              label: 'Manage Feature Overrides',
              href: '/platform/workspaces/overrides/features/create',
            }
          : undefined
      }
    />
  );
}
