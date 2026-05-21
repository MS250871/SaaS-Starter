import { withActionTxContext } from '@/lib/request/withActionContext';
import { listWorkspaceCustomersDirectory } from '@/modules/customer/services/customer.services';
import {
  getWorkspaceSupportSummary,
  getWorkspaceSupportThreadSnapshot,
  hydrateWorkspaceSupportTicketListItems,
  listWorkspaceSupportQueueTicketSnapshots,
} from '@/modules/support/support.services';
import { buildSupportThreadView } from '@/modules/support/server/support-thread-view';
import {
  getSupportContextLabel,
  getSupportTicketOwnerScope,
} from '@/modules/support/support-ownership';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type WorkspaceMemberWithRole = Awaited<
  ReturnType<typeof listActiveWorkspaceMembersWithRoles>
>[number];
type WorkspaceSupportThreadSnapshot = NonNullable<
  Awaited<ReturnType<typeof getWorkspaceSupportThreadSnapshot>>
>;
type WorkspaceSupportPlatformMembership =
  WorkspaceSupportThreadSnapshot['platformMemberships'][number];
type WorkspaceSerializedSupportTicket = Awaited<
  ReturnType<typeof hydrateWorkspaceSupportTicketListItems>
>[number];

export async function getWorkspaceSupportQueuePageData(params: {
  queue: 'workspace' | 'platform';
}) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        queue: params.queue,
        tickets: [],
        supportSummary: {
          openWorkspaceTickets: 0,
          openPlatformEscalations: 0,
          totalWorkspaceTickets: 0,
          totalPlatformEscalations: 0,
        },
      };
    }

    const [supportSummary, queuePage] = await Promise.all([
      getWorkspaceSupportSummary(context.workspaceId),
      listWorkspaceSupportQueueTicketSnapshots({
        workspaceId: context.workspaceId,
        queue: params.queue,
      }),
    ]);

    const serializedTickets = await hydrateWorkspaceSupportTicketListItems(queuePage);

    return {
      ...context,
      queue: params.queue,
      tickets: serializedTickets,
      supportSummary: {
        ...supportSummary,
      },
    };
  });
}

export async function getWorkspaceSupportCreatePageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    const customerOptions = context.workspaceId
      ? await listWorkspaceCustomersDirectory(context.workspaceId)
      : [];

    return {
      ...context,
      customerOptions: customerOptions.map((customer) => ({
        id: customer.id,
        name:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
        email: customer.identity.email ?? null,
      })),
    };
  });
}

export async function getWorkspaceSupportThreadPageData(ticketId: string) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        selectedQueue: 'workspace' as const,
        selectedTicket: null,
        assigneeOptions: [],
        backHref: `${context.basePath}/support`,
      };
    }

    const [threadSnapshot, workspaceMembers] = await Promise.all([
      getWorkspaceSupportThreadSnapshot(context.workspaceId, ticketId),
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
    ]);

    if (!threadSnapshot) {
      return {
        ...context,
        selectedQueue: 'workspace' as const,
        selectedTicket: null,
        assigneeOptions: workspaceMembers.map((member: WorkspaceMemberWithRole) => ({
          identityId: member.identityId,
          name:
            `${member.identity.firstName ?? ''} ${
              member.identity.lastName ?? ''
            }`.trim() ||
            member.identity.email ||
            'Workspace member',
          email: member.identity.email ?? null,
        })),
        backHref: `${context.basePath}/support`,
      };
    }

    const [serializedTicket]: WorkspaceSerializedSupportTicket[] =
      await hydrateWorkspaceSupportTicketListItems([threadSnapshot.ticket]);
    const workspaceIdentityIds = new Set<string>(
      workspaceMembers.map((member: WorkspaceMemberWithRole) => member.identityId),
    );
    const platformIdentityIds = new Set<string>(
      threadSnapshot.platformMemberships.map(
        (membership: WorkspaceSupportPlatformMembership) => membership.identityId,
      ),
    );
    const selectedQueue =
      threadSnapshot.ticket.contextType === 'PLATFORM' ? 'platform' : 'workspace';
    const ownerScope = getSupportTicketOwnerScope(threadSnapshot.ticket.contextType);
    const threadView = buildSupportThreadView({
      ticket: serializedTicket,
      threadSnapshot,
      viewerScope: 'workspace',
      ownerScope,
      workspaceIdentityIds,
      platformIdentityIds,
      downloadRouteBase: '/api/workspace/media',
    });

    return {
      ...context,
      selectedQueue,
      selectedTicket: {
        ...serializedTicket,
        contextLabel: getSupportContextLabel(threadSnapshot.ticket.contextType),
        ownerScope,
        conversationItems: threadView.conversationItems,
        internalNotes: threadView.internalNotes,
      },
      assigneeOptions: workspaceMembers.map((member: WorkspaceMemberWithRole) => ({
        identityId: member.identityId,
        name:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
        email: member.identity.email ?? null,
      })),
      backHref:
        threadSnapshot.ticket.contextType === 'PLATFORM'
          ? `${context.basePath}/support/escalations`
          : `${context.basePath}/support`,
    };
  });
}
