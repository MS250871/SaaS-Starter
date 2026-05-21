import type { WorkspaceSupportThreadSnapshot } from '@/modules/support/support.services';
import type { SupportOwnerScope } from '@/modules/support/support-ownership';

type SupportIdentity = WorkspaceSupportThreadSnapshot['messageIdentities'][number];
type SupportCustomer = WorkspaceSupportThreadSnapshot['messageCustomers'][number];
type SupportAttachment = WorkspaceSupportThreadSnapshot['messageAttachments'][number];
type SupportTicketAttachment = WorkspaceSupportThreadSnapshot['ticketAttachments'][number];

export type SupportViewerScope = 'workspace' | 'platform' | 'customer';
export type SupportSenderScope = 'workspace' | 'platform' | 'customer' | 'system';

export type SupportThreadAttachmentItem = {
  id: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
};

export type SupportThreadEntryView = {
  id: string;
  kind: 'opening' | 'reply' | 'internal_note';
  senderType: string;
  senderScope: SupportSenderScope;
  senderName: string;
  message: string;
  createdAt: string;
  attachments: SupportThreadAttachmentItem[];
};

type SerializedSupportTicket = {
  id: string;
  body: string;
  createdAt: string;
  createdById: string | null;
  createdByName: string | null;
  createdByCustomerId: string | null;
  createdByCustomerName: string | null;
};

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
}): SupportSenderScope {
  if (params.senderCustomerId) {
    return 'customer';
  }

  if (params.senderIdentityId) {
    if (params.platformIdentityIds.has(params.senderIdentityId)) {
      return 'platform';
    }

    if (params.workspaceIdentityIds.has(params.senderIdentityId)) {
      return 'workspace';
    }
  }

  return 'system';
}

function buildAttachmentItem(
  attachment: SupportAttachment | SupportTicketAttachment,
  downloadRouteBase: string,
): SupportThreadAttachmentItem {
  return {
    id: attachment.id,
    mediaId: attachment.mediaId,
    fileName: attachment.media.fileName,
    mimeType: attachment.media.mimeType,
    size: attachment.media.size,
    previewUrl: `${downloadRouteBase}/${attachment.mediaId}/download`,
    downloadUrl: `${downloadRouteBase}/${attachment.mediaId}/download?download=1`,
  };
}

export function buildSupportThreadView(params: {
  ticket: SerializedSupportTicket;
  threadSnapshot: WorkspaceSupportThreadSnapshot;
  viewerScope: SupportViewerScope;
  ownerScope: SupportOwnerScope;
  workspaceIdentityIds: Set<string>;
  platformIdentityIds: Set<string>;
  downloadRouteBase: string;
}) {
  const messageIdentityMap = new Map<string, SupportIdentity>(
    params.threadSnapshot.messageIdentities.map((identity) => [identity.id, identity]),
  );
  const messageCustomerMap = new Map<string, SupportCustomer>(
    params.threadSnapshot.messageCustomers.map((customer) => [customer.id, customer]),
  );
  const messageAttachmentMap = new Map<string, SupportThreadAttachmentItem[]>();

  for (const attachment of params.threadSnapshot.messageAttachments) {
    const existing = messageAttachmentMap.get(attachment.entityId) ?? [];
    existing.push(buildAttachmentItem(attachment, params.downloadRouteBase));
    messageAttachmentMap.set(attachment.entityId, existing);
  }

  const openingSenderScope = params.ticket.createdByCustomerId
    ? 'customer'
    : params.ticket.createdById &&
        params.platformIdentityIds.has(params.ticket.createdById)
      ? 'platform'
      : params.ticket.createdById &&
          params.workspaceIdentityIds.has(params.ticket.createdById)
        ? 'workspace'
        : 'system';

  const openingItem: SupportThreadEntryView = {
    id: `opening-${params.ticket.id}`,
    kind: 'opening',
    senderType: params.ticket.createdByCustomerId ? 'CUSTOMER' : 'IDENTITY',
    senderScope: openingSenderScope,
    senderName:
      params.ticket.createdByCustomerName ?? params.ticket.createdByName ?? 'Unknown sender',
    message: params.ticket.body,
    createdAt: params.ticket.createdAt,
    attachments: params.threadSnapshot.ticketAttachments.map((attachment) =>
      buildAttachmentItem(attachment, params.downloadRouteBase),
    ),
  };

  const replies: SupportThreadEntryView[] = [];
  const internalNotes: SupportThreadEntryView[] = [];

  for (const message of params.threadSnapshot.messages) {
    const item: SupportThreadEntryView = {
      id: message.id,
      kind: message.isInternalNote ? 'internal_note' : 'reply',
      senderType: message.senderType,
      senderScope: resolveSupportSenderScope({
        senderCustomerId: message.senderCustomerId,
        senderIdentityId: message.senderIdentityId,
        workspaceIdentityIds: params.workspaceIdentityIds,
        platformIdentityIds: params.platformIdentityIds,
      }),
      senderName: resolveSupportSenderName({
        identity: message.senderIdentityId
          ? messageIdentityMap.get(message.senderIdentityId) ?? null
          : null,
        customer: message.senderCustomerId
          ? messageCustomerMap.get(message.senderCustomerId) ?? null
          : null,
      }),
      message: message.message,
      createdAt: message.createdAt.toISOString(),
      attachments: messageAttachmentMap.get(message.id) ?? [],
    };

    if (message.isInternalNote) {
      if (params.viewerScope === params.ownerScope) {
        internalNotes.push(item);
      }
      continue;
    }

    replies.push(item);
  }

  return {
    conversationItems: [openingItem, ...replies],
    internalNotes,
  };
}
