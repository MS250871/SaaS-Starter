import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformAdminAuditSnapshots } from '@/modules/audit/audit.services';

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatIdentityName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    params.phone ||
    'Unknown admin'
  );
}

export type PlatformGovernanceAuditRow = {
  id: string;
  adminIdentityId: string;
  adminDisplayName: string;
  adminEmail: string | null;
  adminRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  workspaceLabel: string;
  severityLabel: string;
  sourceLabel: string;
  description: string | null;
  requestId: string | null;
  createdAtLabel: string;
};

export async function getPlatformGovernanceAuditPageData() {
  return withActionTxContext(async () => {
    const logs = await listPlatformAdminAuditSnapshots({ limit: 500 });

    const rows: PlatformGovernanceAuditRow[] = logs.map((log) => ({
      id: log.id,
      adminIdentityId: log.adminIdentity.id,
      adminDisplayName: formatIdentityName(log.adminIdentity),
      adminEmail: log.adminIdentity.email ?? log.adminEmail ?? null,
      adminRole: log.adminRole ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      workspaceLabel: log.workspace
        ? `${log.workspace.name} (${log.workspace.slug})`
        : 'Platform',
      severityLabel: formatEnumLabel(log.severity),
      sourceLabel: formatEnumLabel(log.source),
      description: log.description ?? null,
      requestId: log.requestId ?? null,
      createdAtLabel: formatDate(log.createdAt),
    }));

    return {
      summary: {
        total: rows.length,
        errors: rows.filter((row) => row.severityLabel === 'Error').length,
        warnings: rows.filter((row) => row.severityLabel === 'Warning').length,
        platformScoped: rows.filter((row) => row.workspaceLabel === 'Platform').length,
      },
      rows,
    };
  });
}
