'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import {
  deleteRoleDefinitionAdminAction,
  toggleRoleDefinitionActiveAction,
} from '@/modules/roles/actions/platform-role-admin.actions';
import { GovernanceRowMenu } from '@/modules/platform/components/governance/menus/governance-row-menu';
import type { PlatformGovernanceRoleRow } from '@/modules/roles/server/platform-governance-roles-page-data';

export function PlatformGovernanceRolesTable({
  rows,
}: {
  rows: PlatformGovernanceRoleRow[];
}) {
  const columns: ColumnDef<PlatformGovernanceRoleRow>[] = [
    {
      accessorKey: 'name',
      header: 'Role',
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
      accessorKey: 'scopeLabel',
      header: 'Scope',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{row.original.scopeLabel}</Badge>
          {row.original.isSystem ? <Badge variant="secondary">System</Badge> : null}
          {row.original.isDefault ? <Badge variant="secondary">Default</Badge> : null}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant={row.original.isActive ? 'default' : 'outline'}>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant={row.original.isAssignable ? 'secondary' : 'outline'}>
            {row.original.isAssignable ? 'Assignable' : 'Locked'}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'permissionCount',
      header: 'Permission grants',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.permissionCount} direct grants</p>
          <p className="text-muted-foreground">
            Rank {row.original.hierarchyRankLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'assignmentCount',
      header: 'Assignments',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.assignmentCount} memberships</p>
          <p className="text-muted-foreground">
            {row.original.inviteCount} invites / {row.original.overrideCount} overrides
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
          entityLabel="Role"
          entityId={row.original.id}
          idField="roleDefinitionId"
          viewHref={`/platform/governance/roles/${row.original.id}`}
          editHref={`/platform/governance/roles/${row.original.id}/edit`}
          isActive={row.original.isActive}
          canToggle={!row.original.isSystem}
          canDelete={!row.original.isSystem}
          toggleAction={toggleRoleDefinitionActiveAction}
          deleteAction={deleteRoleDefinitionAdminAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Roles"
      columns={columns}
      data={rows}
      searchPlaceholder="Search roles by name, key, scope, or system flag"
      emptyStateTitle="No roles found"
      emptyStateDescription="Role definitions will appear here once the authorization catalog is seeded."
      primaryAction={{
        label: 'Create Role',
        href: '/platform/governance/roles/create',
      }}
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={[
        {
          label: 'Platform Team',
          href: '/platform/governance/team',
          variant: 'outline',
        },
        {
          label: 'Audit Log',
          href: '/platform/governance/audit',
          variant: 'outline',
        },
      ]}
    />
  );
}
