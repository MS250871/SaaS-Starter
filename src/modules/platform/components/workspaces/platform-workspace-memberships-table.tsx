'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformWorkspaceMembershipRow } from '@/modules/workspace/server/platform-workspace-admin-data';
import { PlatformWorkspaceLinkActions } from '@/modules/platform/components/workspaces/platform-workspace-link-actions';

export function PlatformWorkspaceMembershipsTable({
  rows,
}: {
  rows: PlatformWorkspaceMembershipRow[];
}) {
  const columns: ColumnDef<PlatformWorkspaceMembershipRow>[] = [
    {
      accessorKey: 'memberName',
      header: 'Member',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.memberName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.memberEmail ?? 'No email'}
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
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p>{row.original.roleName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.roleSystemKey ?? row.original.roleKey ?? 'Custom role'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.statusLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'expiresAtLabel',
      header: 'Expires',
    },
    {
      accessorKey: 'createdAtLabel',
      header: 'Added',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <PlatformWorkspaceLinkActions
          label="membership"
          actions={[
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
      title="Workspace Memberships"
      columns={columns}
      data={rows}
      searchPlaceholder="Search members by name, email, workspace, or role"
      emptyStateTitle="No memberships found"
      emptyStateDescription="Workspace memberships will appear here after team provisioning."
    />
  );
}
