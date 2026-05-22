import { readActorContext } from '@/lib/request/read-actor-context';
import { withActionTxContext } from '@/lib/request/withActionContext';
import { buildSupportThreadView } from '@/modules/support/server/support-thread-view';
import {
  getCustomerSupportSummary,
  getCustomerSupportTicketById,
  getWorkspaceSupportThreadSnapshot,
  hydrateWorkspaceSupportTicketListItems,
  listCustomerSupportQueueTickets,
} from '@/modules/support/services/support.services';
import { getSupportContextLabel } from '@/modules/support/support-ownership';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';

const CUSTOMER_SUPPORT_PAGE_SIZE = 10;

function normalizePageNumber(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

async function getCustomerSupportSurfaceContext() {
  const { actor, session } = await readActorContext();

  return {
    actor,
    session,
    workspaceId: actor.workspaceId ?? session?.workspaceId ?? null,
    customerId: actor.customerId ?? session?.customerId ?? null,
    basePath: '/customer',
  };
}

export async function getCustomerSupportQueuePageData(params?: {
  page?: number | null;
  pageSize?: number;
}) {
  return withActionTxContext(async () => {
    const context = await getCustomerSupportSurfaceContext();
    const page = normalizePageNumber(params?.page);
    const pageSize = params?.pageSize ?? CUSTOMER_SUPPORT_PAGE_SIZE;

    if (!context.workspaceId || !context.customerId) {
      return {
        ...context,
        tickets: [],
        page,
        pageSize,
        totalItems: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        supportSummary: {
          totalTickets: 0,
          openTickets: 0,
        },
      };
    }

    const [supportSummary, queuePage] = await Promise.all([
      getCustomerSupportSummary({
        workspaceId: context.workspaceId,
        customerId: context.customerId,
      }),
      listCustomerSupportQueueTickets({
        workspaceId: context.workspaceId,
        customerId: context.customerId,
        page,
        pageSize,
      }),
    ]);

    const tickets = await hydrateWorkspaceSupportTicketListItems(queuePage.tickets);
    const totalPages = Math.max(1, Math.ceil(queuePage.totalItems / pageSize));

    return {
      ...context,
      tickets,
      page,
      pageSize,
      totalItems: queuePage.totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      supportSummary,
    };
  });
}

export async function getCustomerSupportOverviewData() {
  return withActionTxContext(async () => {
    const context = await getCustomerSupportSurfaceContext();

    if (!context.workspaceId || !context.customerId) {
      return {
        supportSummary: {
          totalTickets: 0,
          openTickets: 0,
        },
        recentTickets: [],
      };
    }

    const [supportSummary, queuePage] = await Promise.all([
      getCustomerSupportSummary({
        workspaceId: context.workspaceId,
        customerId: context.customerId,
      }),
      listCustomerSupportQueueTickets({
        workspaceId: context.workspaceId,
        customerId: context.customerId,
        page: 1,
        pageSize: 3,
      }),
    ]);
    const recentTickets = await hydrateWorkspaceSupportTicketListItems(
      queuePage.tickets,
    );

    return {
      supportSummary,
      recentTickets,
    };
  });
}

export async function getCustomerSupportCreatePageData() {
  return withActionTxContext(async () => getCustomerSupportSurfaceContext());
}

export async function getCustomerSupportThreadPageData(ticketId: string) {
  return withActionTxContext(async () => {
    const context = await getCustomerSupportSurfaceContext();

    if (!context.workspaceId || !context.customerId) {
      return {
        ...context,
        selectedTicket: null,
        backHref: `${context.basePath}/support`,
      };
    }

    const ticket = await getCustomerSupportTicketById({
      workspaceId: context.workspaceId,
      customerId: context.customerId,
      ticketId,
    }).catch(() => null);

    if (!ticket) {
      return {
        ...context,
        selectedTicket: null,
        backHref: `${context.basePath}/support`,
      };
    }

    const [threadSnapshot, workspaceMembers] = await Promise.all([
      getWorkspaceSupportThreadSnapshot(context.workspaceId, ticket.id),
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
    ]);

    if (!threadSnapshot) {
      return {
        ...context,
        selectedTicket: null,
        backHref: `${context.basePath}/support`,
      };
    }

    const [serializedTicket] = await hydrateWorkspaceSupportTicketListItems([
      threadSnapshot.ticket,
    ]);
    const workspaceIdentityIds = new Set(
      workspaceMembers.map((member) => member.identityId),
    );
    const platformIdentityIds = new Set(
      threadSnapshot.platformMemberships.map((membership) => membership.identityId),
    );
    const threadView = buildSupportThreadView({
      ticket: serializedTicket,
      threadSnapshot,
      viewerScope: 'customer',
      ownerScope: 'workspace',
      workspaceIdentityIds,
      platformIdentityIds,
      downloadRouteBase: '/api/customer/media',
    });

    return {
      ...context,
      selectedTicket: {
        ...serializedTicket,
        contextLabel: getSupportContextLabel(threadSnapshot.ticket.contextType),
        ownerScope: 'workspace' as const,
        conversationItems: threadView.conversationItems,
        internalNotes: threadView.internalNotes,
      },
      backHref: `${context.basePath}/support`,
    };
  });
}
