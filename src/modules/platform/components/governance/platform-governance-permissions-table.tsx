'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import {
  deletePermissionAdminAction,
  togglePermissionAdminAction,
} from '@/modules/permissions/actions/platform-permission-admin.actions';
import { GovernanceRowMenu } from '@/modules/platform/components/governance/menus/governance-row-menu';
import type { PlatformGovernancePermissionRow } from '@/modules/roles/server/platform-governance-roles-page-data';

export function PlatformGovernancePermissionsTable({
  rows,
}: {
  rows: PlatformGovernancePermissionRow[];
}) {
  const columns: ColumnDef<PlatformGovernancePermissionRow>[] = [
    {
      accessorKey: 'key',
      header: 'Permission',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">
            {row.original.name ?? row.original.key}
          </p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.key}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'entity',
      header: 'Entity',
      cell: ({ row }) => <Badge variant="outline">{row.original.entity}</Badge>,
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
      accessorKey: 'roleGrantCount',
      header: 'Usage',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.roleGrantCount} role grants</p>
          <p className="text-muted-foreground">
            {row.original.workspaceOverrideCount} workspace /{' '}
            {row.original.userOverrideCount} user overrides
          </p>
        </div>
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
        <GovernanceRowMenu
          entityLabel="Permission"
          entityId={row.original.id}
          idField="permissionId"
          viewHref={`/platform/governance/permissions/${row.original.id}`}
          editHref={`/platform/governance/permissions/${row.original.id}/edit`}
          isActive={row.original.isActive}
          toggleAction={togglePermissionAdminAction}
          deleteAction={deletePermissionAdminAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Permissions"
      columns={columns}
      data={rows}
      searchPlaceholder="Search permissions by key, name, entity, or usage"
      emptyStateTitle="No permissions found"
      emptyStateDescription="Permission definitions will appear here once the authorization catalog is seeded."
      primaryAction={{
        label: 'Create Permission',
        href: '/platform/governance/permissions/create',
      }}
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
