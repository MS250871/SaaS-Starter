'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import type { PlatformGovernanceAuditRow } from '@/modules/audit/server/platform-governance-audit-page-data';

function shortEntityId(entityId: string) {
  return entityId.length > 12 ? `${entityId.slice(0, 8)}...` : entityId;
}

function severityVariant(severity: string) {
  if (severity === 'Error') {
    return 'destructive' as const;
  }

  if (severity === 'Warning') {
    return 'outline' as const;
  }

  return 'secondary' as const;
}

export function PlatformGovernanceAuditTable({
  rows,
}: {
  rows: PlatformGovernanceAuditRow[];
}) {
  const columns: ColumnDef<PlatformGovernanceAuditRow>[] = [
    {
      accessorKey: 'adminDisplayName',
      header: 'Admin',
      cell: ({ row }) => (
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{row.original.adminDisplayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.adminEmail ?? row.original.adminRole ?? 'Platform operator'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.14em]">
            {row.original.action}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.description ?? 'No description recorded'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Target',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.entityType}</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {shortEntityId(row.original.entityId)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'workspaceLabel',
      header: 'Scope',
    },
    {
      accessorKey: 'severityLabel',
      header: 'Severity',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge variant={severityVariant(row.original.severityLabel)}>
            {row.original.severityLabel}
          </Badge>
          <Badge variant="outline">{row.original.sourceLabel}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'createdAtLabel',
      header: 'When',
    },
  ];

  return (
    <AdminDataTable
      title="Audit log"
      columns={columns}
      data={rows}
      searchPlaceholder="Search audit logs by admin, action, entity, scope, or request ID"
      emptyStateTitle="No audit log entries found"
      emptyStateDescription="Governance audit events will appear here as platform operators perform tracked actions."
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
          label: 'Roles & Permissions',
          href: '/platform/governance/roles',
          variant: 'outline',
        },
      ]}
    />
  );
}
