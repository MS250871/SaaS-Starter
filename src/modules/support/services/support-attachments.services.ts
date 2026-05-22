import { attachMediaToEntity, uploadMediaObject } from '@/modules/media/services/media.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { findFileAttachmentByScopedMediaId } from '@/modules/media/services/media.services';
import { SupportContextType } from '@/generated/prisma/client';
import {
  supportTicketMessageQueries,
  supportTicketQueries,
} from '@/modules/support/db';

const MAX_SUPPORT_ATTACHMENTS = 5;
const MAX_SUPPORT_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;

export const SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE = 'SUPPORT_TICKET';
export const SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE =
  'SUPPORT_TICKET_MESSAGE';

export type SupportAttachmentSummary = {
  id: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
};

function isFormUploadFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && value.size > 0;
}

export function getSupportAttachmentFiles(formData: FormData, fieldName = 'attachments') {
  return formData.getAll(fieldName).filter(isFormUploadFile);
}

export async function createSupportAttachments(params: {
  files: File[];
  workspaceId: string;
  identityId: string;
  customerId?: string;
  entityType: string;
  entityId: string;
}) {
  if (params.files.length === 0) {
    return [];
  }

  if (params.files.length > MAX_SUPPORT_ATTACHMENTS) {
    throwError(
      ERR.INVALID_INPUT,
      `You can upload up to ${MAX_SUPPORT_ATTACHMENTS} attachments per support message.`,
    );
  }

  const attachments: SupportAttachmentSummary[] = [];

  for (const file of params.files) {
    if (file.size > MAX_SUPPORT_ATTACHMENT_SIZE_BYTES) {
      throwError(
        ERR.INVALID_INPUT,
        `${file.name} exceeds the ${Math.floor(
          MAX_SUPPORT_ATTACHMENT_SIZE_BYTES / (1024 * 1024),
        )} MB attachment limit.`,
      );
    }

    const body = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaObject({
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      customerId: params.customerId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      body,
      prefix: 'support',
      markReady: true,
      metadata: {
        entityType: params.entityType,
      },
    });

    const attachment = await attachMediaToEntity({
      mediaId: uploaded.media.id,
      entityType: params.entityType,
      entityId: params.entityId,
      workspaceId: params.workspaceId,
      identityId: params.identityId,
      customerId: params.customerId,
    });

    attachments.push({
      id: attachment.id,
      mediaId: uploaded.media.id,
      fileName: uploaded.media.fileName,
      mimeType: uploaded.media.mimeType,
      size: uploaded.media.size,
      url: uploaded.media.cdnUrl ?? uploaded.media.url,
    });
  }

  return attachments;
}

export async function getWorkspaceSupportAttachmentAccess(params: {
  workspaceId: string;
  mediaId: string;
}) {
  if (!params.workspaceId || !params.mediaId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and mediaId are required');
  }

  const attachment = await findFileAttachmentByScopedMediaId({
    mediaId: params.mediaId,
    workspaceId: params.workspaceId,
    entityTypes: [
      SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
    ],
  });

  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  if (attachment.media.status === 'DELETED') {
    throwError(ERR.INVALID_STATE, 'Support attachment is no longer available');
  }

  return {
    attachmentId: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    mediaId: attachment.media.id,
    storageKey: attachment.media.storageKey,
    fileName: attachment.media.fileName,
    mimeType: attachment.media.mimeType,
    status: attachment.media.status,
  };
}

async function getSupportTicketForAttachment(params: {
  entityType: string;
  entityId: string;
}) {
  if (params.entityType === SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE) {
    return supportTicketQueries.findUnique({
      where: {
        id: params.entityId,
      },
      select: {
        id: true,
        workspaceId: true,
        createdByCustomerId: true,
        contextType: true,
      },
    });
  }

  if (params.entityType === SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE) {
    const message = await supportTicketMessageQueries.findUnique({
      where: {
        id: params.entityId,
      },
      select: {
        ticketId: true,
      },
    });

    if (!message?.ticketId) {
      return null;
    }

    return supportTicketQueries.findUnique({
      where: {
        id: message.ticketId,
      },
      select: {
        id: true,
        workspaceId: true,
        createdByCustomerId: true,
        contextType: true,
      },
    });
  }

  return null;
}

function mapAttachmentAccess(
  attachment: Awaited<ReturnType<typeof findFileAttachmentByScopedMediaId>>,
) {
  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  if (attachment.media.status === 'DELETED') {
    throwError(ERR.INVALID_STATE, 'Support attachment is no longer available');
  }

  return {
    attachmentId: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    mediaId: attachment.media.id,
    storageKey: attachment.media.storageKey,
    fileName: attachment.media.fileName,
    mimeType: attachment.media.mimeType,
    status: attachment.media.status,
  };
}

export async function getPlatformSupportAttachmentAccess(params: {
  mediaId: string;
}) {
  if (!params.mediaId) {
    throwError(ERR.INVALID_INPUT, 'mediaId is required');
  }

  const attachment = await findFileAttachmentByScopedMediaId({
    mediaId: params.mediaId,
    entityTypes: [
      SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
    ],
  });

  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  const ticket = await getSupportTicketForAttachment({
    entityType: attachment.entityType,
    entityId: attachment.entityId,
  });

  if (!ticket) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  return mapAttachmentAccess(attachment);
}

export async function getCustomerSupportAttachmentAccess(params: {
  workspaceId: string;
  customerId: string;
  mediaId: string;
}) {
  if (!params.workspaceId || !params.customerId || !params.mediaId) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId, customerId, and mediaId are required',
    );
  }

  const attachment = await findFileAttachmentByScopedMediaId({
    mediaId: params.mediaId,
    workspaceId: params.workspaceId,
    entityTypes: [
      SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
    ],
  });

  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  const ticket = await getSupportTicketForAttachment({
    entityType: attachment.entityType,
    entityId: attachment.entityId,
  });

  if (
    !ticket ||
    ticket.workspaceId !== params.workspaceId ||
    ticket.createdByCustomerId !== params.customerId ||
    ticket.contextType !== SupportContextType.CUSTOMER
  ) {
    throwError(ERR.NOT_FOUND, 'Support attachment not found');
  }

  return mapAttachmentAccess(attachment);
}
