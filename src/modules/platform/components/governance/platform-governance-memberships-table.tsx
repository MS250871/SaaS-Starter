'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import {
  changePlatformMembershipRoleAction,
  togglePlatformMembershipActiveAction,
} from '@/modules/platform/actions/platform-governance-admin.actions';
import { PlatformGovernanceMembershipRowMenu } from '@/modules/platform/components/governance/menus/platform-governance-membership-row-menu';
import type { PlatformGovernanceMembershipRow } from '@/modules/platform/server/platform-governance-team-page-data';
import type { PlatformGovernanceAssignableRole } from '@/modules/platform/server/platform-governance-team-page-data';

export function PlatformGovernanceMembershipsTable({
  rows,
  includeSectionActions = true,
  assignableRoles = [],
  canManageRoles = false,
  onMembershipRoleChanged,
  onMembershipToggled,
}: {
  rows: PlatformGovernanceMembershipRow[];
  includeSectionActions?: boolean;
  assignableRoles?: PlatformGovernanceAssignableRole[];
  canManageRoles?: boolean;
  onMembershipRoleChanged?: (
    membershipId: string,
    nextRole: {
      roleName: string;
      roleKey: string;
      roleSystemKey: string | null;
    },
  ) => void;
  onMembershipToggled?: (
    membershipId: string,
    next: {
      isActive: boolean;
    },
  ) => void;
}) {
  const columns: ColumnDef<PlatformGovernanceMembershipRow>[] = [
    {
      accessorKey: 'displayName',
      header: 'Operator',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.email ?? row.original.phone ?? 'No contact on file'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'identityIsActive',
      header: 'Identity',
      cell: ({ row }) => (
        <Badge variant={row.original.identityIsActive ? 'secondary' : 'outline'}>
          {row.original.identityIsActive ? 'Identity active' : 'Identity inactive'}
        </Badge>
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
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{row.original.scopeLabel}</Badge>
          {row.original.isSystemRole ? (
            <Badge variant="secondary">System</Badge>
          ) : null}
          {row.original.isDefaultRole ? (
            <Badge variant="secondary">Default</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Access',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.isActive ? 'Active membership' : 'Inactive membership'}
        </Badge>
      ),
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
        <PlatformGovernanceMembershipRowMenu
          membershipId={row.original.id}
          identityHref={`/platform/identities/${row.original.identityId}`}
          currentRoleKey={row.original.roleKey}
          isActive={row.original.isActive}
          canManageRoles={canManageRoles}
          assignableRoles={assignableRoles}
          onRoleChangeSuccess={onMembershipRoleChanged}
          onToggleSuccess={onMembershipToggled}
          changeRoleAction={changePlatformMembershipRoleAction}
          toggleAction={togglePlatformMembershipActiveAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Platform team"
      columns={columns}
      data={rows}
      searchPlaceholder="Search operators by name, email, phone, or role"
      emptyStateTitle="No platform operators found"
      emptyStateDescription="Platform memberships will appear here once operators are granted admin access."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={
        includeSectionActions
          ? [
              {
                label: 'Roles & Permissions',
                href: '/platform/governance/roles',
                variant: 'outline',
              },
              {
                label: 'Audit Log',
                href: '/platform/governance/audit',
                variant: 'outline',
              },
            ]
          : []
      }
    />
  );
}
