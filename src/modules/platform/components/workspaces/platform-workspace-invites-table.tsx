'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformWorkspaceInviteRow } from '@/modules/workspace/server/platform-workspace-admin-data';
import { PlatformWorkspaceLinkActions } from '@/modules/platform/components/workspaces/platform-workspace-link-actions';

export function PlatformWorkspaceInvitesTable({
  rows,
}: {
  rows: PlatformWorkspaceInviteRow[];
}) {
  const columns: ColumnDef<PlatformWorkspaceInviteRow>[] = [
    {
      accessorKey: 'email',
      header: 'Invitee',
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
        <Badge
          variant={row.original.statusLabel === 'Pending' ? 'default' : 'outline'}
        >
          {row.original.statusLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'invitedByName',
      header: 'Invited By',
    },
    {
      accessorKey: 'expiresAtLabel',
      header: 'Expires',
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
          label="invite"
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
      title="Workspace Invites"
      columns={columns}
      data={rows}
      searchPlaceholder="Search invites by email, workspace, role, or inviter"
      emptyStateTitle="No invites found"
      emptyStateDescription="Workspace invites will appear here when team onboarding starts."
    />
  );
}
