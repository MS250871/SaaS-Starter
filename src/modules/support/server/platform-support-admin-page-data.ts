import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformMembershipAdminSnapshots } from '@/modules/platform/services/membership.services';
import { buildSupportThreadView } from '@/modules/support/server/support-thread-view';
import {
  getSupportContextLabel,
  getSupportTicketOwnerScope,
} from '@/modules/support/support-ownership';
import {
  getPlatformSupportTicketAdminSnapshot,
  getPlatformSupportTicketThreadSnapshot,
  listPlatformSupportTicketAdminSnapshots,
  type PlatformSupportTicketAdminSnapshot,
} from '@/modules/support/services/support.services';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';
import { listPlatformWorkspaceSelectOptions } from '@/modules/workspace/services/workspace.services';

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
}) {
  return (
    `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
    params.email ||
    'Identity'
  );
}

function buildRequesterLabels(ticket: PlatformSupportTicketAdminSnapshot) {
  if (ticket.createdByCustomer) {
    return {
      requesterLabel: formatIdentityName({
        firstName: ticket.createdByCustomer.identity.firstName,
        lastName: ticket.createdByCustomer.identity.lastName,
        email: ticket.createdByCustomer.identity.email,
      }),
      requesterSubLabel: ticket.createdByCustomer.externalId
        ? `Customer ${ticket.createdByCustomer.externalId}`
        : 'Workspace customer',
    };
  }

  if (ticket.createdBy) {
    return {
      requesterLabel: formatIdentityName(ticket.createdBy),
      requesterSubLabel: 'Workspace member',
    };
  }

  return {
    requesterLabel: 'System',
    requesterSubLabel: 'Automated event',
  };
}

function buildTicketRow(ticket: PlatformSupportTicketAdminSnapshot) {
  const requester = buildRequesterLabels(ticket);

  return {
    id: ticket.id,
    workspaceId: ticket.workspace?.id ?? null,
    workspaceName: ticket.workspace?.name ?? 'Unscoped',
    workspaceSlug: ticket.workspace?.slug ?? 'N/A',
    workspaceIsActive: ticket.workspace?.isActive ?? true,
    title: ticket.title,
    body: ticket.body,
    contextType: ticket.contextType,
    contextTypeLabel: getSupportContextLabel(ticket.contextType),
    ownerScope: getSupportTicketOwnerScope(ticket.contextType),
    status: ticket.status,
    statusLabel: formatEnumLabel(ticket.status),
    priority: ticket.priority ?? null,
    priorityLabel: formatEnumLabel(ticket.priority ?? 'none'),
    requesterLabel: requester.requesterLabel,
    requesterSubLabel: requester.requesterSubLabel,
    assigneeId: ticket.assignedToId ?? null,
    assigneeLabel: ticket.assignedTo
      ? formatIdentityName(ticket.assignedTo)
      : 'Unassigned',
    messageCount: ticket._count.messages,
    createdAtLabel: formatDate(ticket.createdAt),
    updatedAtLabel: formatDate(ticket.updatedAt),
  };
}

export type PlatformSupportTicketRow = ReturnType<typeof buildTicketRow>;

export async function getPlatformSupportPageData() {
  return withActionTxContext(async () => {
    const [tickets, workspaceOptions] = await Promise.all([
      listPlatformSupportTicketAdminSnapshots(),
      listPlatformWorkspaceSelectOptions(),
    ]);
    const rows = tickets.map(buildTicketRow);
    const platformRows = rows.filter((row) => row.ownerScope === 'platform');
    const workspaceRows = rows.filter((row) => row.ownerScope === 'workspace');

    return {
      summary: {
        total: rows.length,
        open: platformRows.filter((row) =>
          ['open', 'in_progress'].includes(row.status),
        ).length,
        platformEscalations: platformRows.length,
        workspaceOwned: workspaceRows.length,
        assigned: platformRows.filter((row) => row.assigneeId !== null).length,
      },
      workspaceOptions: workspaceOptions.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
      })),
      rows,
      platformRows,
      workspaceRows,
    };
  });
}

export async function getPlatformSupportTicketDetailPageData(ticketId: string) {
  return withActionTxContext(async () => {
    const [ticket, threadSnapshot, memberships] = await Promise.all([
      getPlatformSupportTicketAdminSnapshot(ticketId),
      getPlatformSupportTicketThreadSnapshot(ticketId),
      listPlatformMembershipAdminSnapshots(),
    ]);

    if (!threadSnapshot) {
      return null;
    }

    const row = buildTicketRow(ticket);
    const workspaceMembers = ticket.workspaceId
      ? await listActiveWorkspaceMembersWithRoles(ticket.workspaceId)
      : [];
    const platformIdentityIds = new Set(
      memberships
        .filter((membership) => membership.isActive)
        .map((membership) => membership.identityId),
    );
    const threadView = buildSupportThreadView({
      ticket: {
        id: row.id,
        body: ticket.body,
        createdAt: ticket.createdAt.toISOString(),
        createdById: ticket.createdById,
        createdByName: row.requesterSubLabel === 'Workspace customer' ? null : row.requesterLabel,
        createdByCustomerId: ticket.createdByCustomerId,
        createdByCustomerName: ticket.createdByCustomerId ? row.requesterLabel : null,
      },
      threadSnapshot,
      viewerScope: 'platform',
      ownerScope: row.ownerScope,
      workspaceIdentityIds: new Set(
        workspaceMembers.map((member) => member.identityId),
      ),
      platformIdentityIds,
      downloadRouteBase: '/api/platform/media',
    });

    const assigneeOptions = memberships
      .filter((membership) => membership.isActive)
      .map((membership) => ({
        identityId: membership.identityId,
        name: formatIdentityName(membership.identity),
        email: membership.identity.email ?? null,
        roleLabel: membership.roleDefinition.name,
      }));

    return {
      ticket: row,
      conversationItems: threadView.conversationItems.map((item) => ({
        ...item,
        createdAtLabel: formatDate(new Date(item.createdAt)),
      })),
      internalNotes: threadView.internalNotes.map((item) => ({
        ...item,
        createdAtLabel: formatDate(new Date(item.createdAt)),
      })),
      assigneeOptions,
    };
  });
}
