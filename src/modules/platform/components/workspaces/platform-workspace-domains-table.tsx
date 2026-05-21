'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { AdminDataTable } from '@/components/data-table/admin-data-table';
import { Badge } from '@/components/ui/badge';
import {
  deletePlatformWorkspaceDomainAction,
  refreshPlatformWorkspaceDomainVerificationAction,
  setPlatformWorkspacePrimaryDomainAction,
} from '@/modules/workspace/actions/platform-workspace-domain-admin.actions';
import { PlatformWorkspaceDomainRowActions } from '@/modules/platform/components/workspaces/platform-workspace-domain-row-actions';
import type { PlatformWorkspaceDomainRow } from '@/modules/workspace/server/platform-workspace-admin-data';

export function PlatformWorkspaceDomainsTable({
  rows,
  canVerifyDomains,
  canSetPrimaryDomains,
  canDeleteDomains,
}: {
  rows: PlatformWorkspaceDomainRow[];
  canVerifyDomains: boolean;
  canSetPrimaryDomains: boolean;
  canDeleteDomains: boolean;
}) {
  const columns: ColumnDef<PlatformWorkspaceDomainRow>[] = [
    {
      accessorKey: 'domain',
      header: 'Domain',
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.domain}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.typeLabel} / {row.original.routingModeLabel}
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
      accessorKey: 'statusLabel',
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={row.original.isVerified ? 'default' : 'outline'}>
            {row.original.verificationLabel}
          </Badge>
          <p className="text-xs text-muted-foreground">{row.original.statusLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: 'isPrimary',
      header: 'Primary',
      cell: ({ row }) => (
        <Badge variant={row.original.isPrimary ? 'secondary' : 'outline'}>
          {row.original.isPrimary ? 'Primary route' : 'Secondary'}
        </Badge>
      ),
    },
    {
      accessorKey: 'dnsHealthLabel',
      header: 'DNS Health',
    },
    {
      accessorKey: 'lastCheckedAtLabel',
      header: 'Last Checked',
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
        <PlatformWorkspaceDomainRowActions
          workspaceId={row.original.workspaceId}
          workspaceDomainId={row.original.id}
          domainType={row.original.type}
          isPrimary={row.original.isPrimary}
          isVerified={row.original.isVerified}
          canVerifyDomains={canVerifyDomains}
          canSetPrimaryDomains={canSetPrimaryDomains}
          canDeleteDomains={canDeleteDomains}
          refreshVerificationAction={refreshPlatformWorkspaceDomainVerificationAction}
          setPrimaryAction={setPlatformWorkspacePrimaryDomainAction}
          deleteAction={deletePlatformWorkspaceDomainAction}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      title="Domains & Routing"
      columns={columns}
      data={rows}
      searchPlaceholder="Search domains by hostname, workspace, status, or routing mode"
      emptyStateTitle="No domains found"
      emptyStateDescription="Workspace routing records will appear here once hosts are provisioned."
      secondaryActions={[
        {
          label: 'All Workspaces',
          href: '/platform/workspaces',
          variant: 'outline',
        },
      ]}
    />
  );
}
