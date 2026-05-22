'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import {
  changePlatformInviteRoleAction,
  revokePlatformInviteAction,
} from '@/modules/platform/actions/platform-governance-admin.actions';
import { PlatformGovernanceInviteRowMenu } from '@/modules/platform/components/governance/menus/platform-governance-invite-row-menu';
import type {
  PlatformGovernanceAssignableRole,
  PlatformGovernanceInviteRow,
} from '@/modules/platform/server/platform-governance-team-page-data';

export function PlatformGovernanceInvitesTable({
  rows,
  assignableRoles = [],
  canManageRoles = false,
  onInviteRoleChanged,
  onInviteRevoked,
}: {
  rows: PlatformGovernanceInviteRow[];
  assignableRoles?: PlatformGovernanceAssignableRole[];
  canManageRoles?: boolean;
  onInviteRoleChanged?: (
    inviteId: string,
    nextRole: {
      roleName: string;
      roleKey: string;
      roleSystemKey: string | null;
    },
  ) => void;
  onInviteRevoked?: (inviteId: string) => void;
}) {
  const columns: ColumnDef<PlatformGovernanceInviteRow>[] = [
    {
      accessorKey: 'email',
      header: 'Invitee',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.email}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.invitedByName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.roleName}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.roleSystemKey ?? row.original.roleKey}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'scopeLabel',
      header: 'Scope',
      cell: ({ row }) => <Badge variant="outline">{row.original.scopeLabel}</Badge>,
    },
    {
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isPending ? 'default' : 'outline'}>
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
      header: 'Created',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <PlatformGovernanceInviteRowMenu
          inviteId={row.original.id}
          canRevoke={row.original.isPending}
          canManageRoles={canManageRoles && row.original.isPending}
          currentRoleKey={row.original.roleKey}
          assignableRoles={assignableRoles}
          onRoleChangeSuccess={onInviteRoleChanged}
          onRevokeSuccess={onInviteRevoked}
          changeRoleAction={changePlatformInviteRoleAction}
          revokeAction={revokePlatformInviteAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Platform invites"
      columns={columns}
      data={rows}
      searchPlaceholder="Search invites by email, role, or inviter"
      emptyStateTitle="No platform invites found"
      emptyStateDescription="New control-plane invites will appear here once operator onboarding begins."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
    />
  );
}
