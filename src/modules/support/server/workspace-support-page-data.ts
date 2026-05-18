import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getWorkspaceSupportSummary,
  getWorkspaceSupportThreadSnapshot,
  hydrateWorkspaceSupportTicketListItems,
  listWorkspaceSupportQueueTickets,
} from '@/modules/support/support.services';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type WorkspaceMemberWithRole = Awaited<
  ReturnType<typeof listActiveWorkspaceMembersWithRoles>
>[number];
type WorkspaceSupportThreadSnapshot = NonNullable<
  Awaited<ReturnType<typeof getWorkspaceSupportThreadSnapshot>>
>;
type WorkspaceSupportMessage = WorkspaceSupportThreadSnapshot['messages'][number];
type WorkspaceSupportMessageIdentity =
  WorkspaceSupportThreadSnapshot['messageIdentities'][number];
type WorkspaceSupportMessageCustomer =
  WorkspaceSupportThreadSnapshot['messageCustomers'][number];
type WorkspaceSupportPlatformMembership =
  WorkspaceSupportThreadSnapshot['platformMemberships'][number];
type WorkspaceSupportAttachment =
  WorkspaceSupportThreadSnapshot['messageAttachments'][number];
type WorkspaceSerializedSupportTicket = Awaited<
  ReturnType<typeof hydrateWorkspaceSupportTicketListItems>
>[number];

type SupportAttachmentItem = {
  id: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
};

type SupportThreadItem = {
  id: string;
  kind: 'opening' | 'reply' | 'internal_note';
  senderType: string;
  senderScope: 'workspace' | 'platform' | 'customer' | 'system';
  senderName: string;
  message: string;
  createdAt: string;
  attachments: SupportAttachmentItem[];
};

const SUPPORT_PAGE_SIZE = 10;

function normalizePageNumber(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function resolveSupportSenderName(params: {
  identity?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  customer?: {
    identity: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };
  } | null;
}) {
  if (params.customer) {
    return (
      `${params.customer.identity.firstName ?? ''} ${
        params.customer.identity.lastName ?? ''
      }`.trim() ||
      params.customer.identity.email ||
      'Customer'
    );
  }

  if (params.identity) {
    return (
      `${params.identity.firstName ?? ''} ${params.identity.lastName ?? ''}`.trim() ||
      params.identity.email ||
      'Workspace member'
    );
  }

  return 'System';
}

function resolveSupportSenderScope(params: {
  senderCustomerId?: string | null;
  senderIdentityId?: string | null;
  workspaceIdentityIds: Set<string>;
  platformIdentityIds: Set<string>;
}) {
  if (params.senderCustomerId) {
    return 'customer' as const;
  }

  if (params.senderIdentityId) {
    if (params.platformIdentityIds.has(params.senderIdentityId)) {
      return 'platform' as const;
    }

    if (params.workspaceIdentityIds.has(params.senderIdentityId)) {
      return 'workspace' as const;
    }
  }

  return 'system' as const;
}

export async function getWorkspaceSupportQueuePageData(params: {
  queue: 'workspace' | 'platform';
  page?: number | null;
}) {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();
    const page = normalizePageNumber(params.page);

    if (!context.workspaceId) {
      return {
        ...context,
        queue: params.queue,
        tickets: [],
        page,
        pageSize: SUPPORT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
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
      listWorkspaceSupportQueueTickets({
        workspaceId: context.workspaceId,
        queue: params.queue,
        page,
        pageSize: SUPPORT_PAGE_SIZE,
      }),
    ]);

    const serializedTickets = await hydrateWorkspaceSupportTicketListItems(
      queuePage.tickets,
    );
    const totalPages = Math.max(
      1,
      Math.ceil(queuePage.totalItems / SUPPORT_PAGE_SIZE),
    );

    return {
      ...context,
      queue: params.queue,
      tickets: serializedTickets,
      page,
      pageSize: SUPPORT_PAGE_SIZE,
      totalItems: queuePage.totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      supportSummary: {
        ...supportSummary,
      },
    };
  });
}

export async function getWorkspaceSupportCreatePageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    return {
      ...context,
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

    const messageIdentityMap = new Map<string, WorkspaceSupportMessageIdentity>(
      threadSnapshot.messageIdentities.map((identity: WorkspaceSupportMessageIdentity) => [
        identity.id,
        identity,
      ]),
    );
    const messageCustomerMap = new Map<string, WorkspaceSupportMessageCustomer>(
      threadSnapshot.messageCustomers.map((customer: WorkspaceSupportMessageCustomer) => [
        customer.id,
        customer,
      ]),
    );
    const workspaceIdentityIds = new Set<string>(
      workspaceMembers.map((member: WorkspaceMemberWithRole) => member.identityId),
    );
    const platformIdentityIds = new Set<string>(
      threadSnapshot.platformMemberships.map(
        (membership: WorkspaceSupportPlatformMembership) => membership.identityId,
      ),
    );
    const ticketAttachmentItems = threadSnapshot.ticketAttachments.map(
      (attachment: WorkspaceSupportAttachment) => ({
        id: attachment.id,
        mediaId: attachment.mediaId,
        fileName: attachment.media.fileName,
        mimeType: attachment.media.mimeType,
        size: attachment.media.size,
        previewUrl: `/api/workspace/media/${attachment.mediaId}/download`,
        downloadUrl: `/api/workspace/media/${attachment.mediaId}/download?download=1`,
      }),
    );
    const messageAttachmentMap = new Map<string, SupportAttachmentItem[]>();

    for (const attachment of threadSnapshot.messageAttachments as WorkspaceSupportAttachment[]) {
      const nextAttachment = {
        id: attachment.id,
        mediaId: attachment.mediaId,
        fileName: attachment.media.fileName,
        mimeType: attachment.media.mimeType,
        size: attachment.media.size,
        previewUrl: `/api/workspace/media/${attachment.mediaId}/download`,
        downloadUrl: `/api/workspace/media/${attachment.mediaId}/download?download=1`,
      };

      const existing = messageAttachmentMap.get(attachment.entityId) ?? [];
      existing.push(nextAttachment);
      messageAttachmentMap.set(attachment.entityId, existing);
    }

    const openingSenderName =
      serializedTicket.createdByCustomerName ??
      serializedTicket.createdByName ??
      'Unknown sender';
    const openingSenderScope = serializedTicket.createdByCustomerId
      ? 'customer'
      : serializedTicket.createdById &&
          platformIdentityIds.has(serializedTicket.createdById)
        ? 'platform'
        : 'workspace';

    const selectedQueue =
      threadSnapshot.ticket.contextType === 'PLATFORM' ? 'platform' : 'workspace';

    return {
      ...context,
      selectedQueue,
      selectedTicket: {
        ...serializedTicket,
        threadItems: [
          {
            id: `opening-${serializedTicket.id}`,
            kind: 'opening',
            senderType: serializedTicket.createdByCustomerId
              ? 'CUSTOMER'
              : 'IDENTITY',
            senderScope: openingSenderScope,
            senderName: openingSenderName,
            message: serializedTicket.body,
            createdAt: serializedTicket.createdAt,
            attachments: ticketAttachmentItems,
          } satisfies SupportThreadItem,
          ...threadSnapshot.messages.map((message: WorkspaceSupportMessage) => {
            const identity = message.senderIdentityId
              ? messageIdentityMap.get(message.senderIdentityId)
              : null;
            const customer = message.senderCustomerId
              ? messageCustomerMap.get(message.senderCustomerId)
              : null;

            return {
              id: message.id,
              kind: message.isInternalNote ? 'internal_note' : 'reply',
              senderType: message.senderType,
              senderScope: resolveSupportSenderScope({
                senderCustomerId: message.senderCustomerId,
                senderIdentityId: message.senderIdentityId,
                workspaceIdentityIds,
                platformIdentityIds,
              }),
              senderName: resolveSupportSenderName({
                identity,
                customer,
              }),
              message: message.message,
              createdAt: message.createdAt.toISOString(),
              attachments: messageAttachmentMap.get(message.id) ?? [],
            } satisfies SupportThreadItem;
          }),
        ],
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
