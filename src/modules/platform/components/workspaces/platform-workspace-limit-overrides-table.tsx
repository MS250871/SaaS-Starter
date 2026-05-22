'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import type { PlatformWorkspaceLimitOverrideRow } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';
import { PlatformWorkspaceLinkGroup } from '@/modules/platform/components/workspaces/links/platform-workspace-link-group';

export function PlatformWorkspaceLimitOverridesTable({
  rows,
  canCreateOverride,
  canEditOverride,
}: {
  rows: PlatformWorkspaceLimitOverrideRow[];
  canCreateOverride: boolean;
  canEditOverride: boolean;
}) {
  const columns: ColumnDef<PlatformWorkspaceLimitOverrideRow>[] = [
    {
      accessorKey: 'limitName',
      header: 'Limit',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.limitName}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.limitKey}
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
      accessorKey: 'valueInt',
      header: 'Override Value',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.valueInt.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.limitUnit ?? 'units'}
          </p>
        </div>
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
        <PlatformWorkspaceLinkGroup
          label="limit override"
          actions={[
            ...(canEditOverride
              ? [
                  {
                    label: 'Manage workspace limits',
                    href: `/platform/workspaces/overrides/limits/create?workspaceId=${row.original.workspaceId}`,
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
      title="Limit Overrides"
      columns={columns}
      data={rows}
      searchPlaceholder="Search limit overrides by workspace, limit, or unit"
      emptyStateTitle="No limit overrides found"
      emptyStateDescription="Limit overrides will appear here when quota exceptions are introduced."
      primaryAction={
        canCreateOverride
          ? {
              label: 'Manage Limit Overrides',
              href: '/platform/workspaces/overrides/limits/create',
            }
          : undefined
      }
    />
  );
}
