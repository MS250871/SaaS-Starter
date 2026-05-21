'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { togglePlatformWorkspaceActiveAction } from '@/modules/workspace/actions/platform-workspace-admin.actions';
import type { PlatformWorkspaceListRow } from '@/modules/workspace/server/platform-workspace-admin-data';
import { PlatformWorkspaceRowActions } from '@/modules/platform/components/workspaces/platform-workspace-row-actions';

export function PlatformWorkspacesTable({
  rows,
  canToggleWorkspaces = false,
}: {
  rows: PlatformWorkspaceListRow[];
  canToggleWorkspaces?: boolean;
}) {
  const columns: ColumnDef<PlatformWorkspaceListRow>[] = [
    {
      accessorKey: 'name',
      header: 'Workspace',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {row.original.slug}
          </p>
        </div>
      ),
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
      accessorKey: 'routeStrategyLabel',
      header: 'Routing',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.routeStrategyLabel}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.currentHostLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'activePlanName',
      header: 'Plan',
      cell: ({ row }) =>
        row.original.activePlanName ? (
          <div className="space-y-1">
            <p className="font-medium">{row.original.activePlanName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.activeSubscriptionStatus ?? 'Active subscription'}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No paid plan</span>
        ),
    },
    {
      accessorKey: 'memberCount',
      header: 'People',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.memberCount} members</p>
          <p className="text-muted-foreground">
            {row.original.customerCount} customers
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'domainCount',
      header: 'Ops',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p>{row.original.domainCount} domains</p>
          <p className="text-muted-foreground">
            {row.original.inviteCount} invites / {row.original.apiKeyCount} keys
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'primaryEmail',
      header: 'Primary Email',
      cell: ({ row }) =>
        row.original.primaryEmail ?? (
          <span className="text-sm text-muted-foreground">N/A</span>
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
        <PlatformWorkspaceRowActions
          workspaceId={row.original.id}
          viewHref={`/platform/workspaces/${row.original.id}`}
          isActive={row.original.isActive}
          canToggleWorkspace={canToggleWorkspaces}
          toggleAction={togglePlatformWorkspaceActiveAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Workspaces"
      columns={columns}
      data={rows}
      searchPlaceholder="Search workspaces by name, slug, email, host, or plan"
      emptyStateTitle="No workspaces found"
      emptyStateDescription="Workspaces will appear here once tenant provisioning starts."
      headerTextClassName="lg:max-w-[34rem] xl:max-w-[38rem]"
      descriptionClassName="max-w-none"
      actionsClassName="lg:flex-nowrap"
      secondaryActions={[
        {
          label: 'Domains & Routing',
          href: '/platform/workspaces/domains',
          variant: 'outline',
        },
        {
          label: 'Members & Invites',
          href: '/platform/workspaces/access',
          variant: 'outline',
        },
        {
          label: 'Overrides',
          href: '/platform/workspaces/overrides',
          variant: 'outline',
        },
      ]}
    />
  );
}
