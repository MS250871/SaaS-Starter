import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import {
  SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/workspace/services/workspace-support-attachments.services';

export async function getWorkspaceSupportAttachmentAccessWorkflow(input: {
  workspaceId: string;
  mediaId: string;
}) {
  return withUnitOfWork(async () => {
    const attachment = await prisma.fileAttachment.findFirst({
      where: {
        mediaId: input.mediaId,
        workspaceId: input.workspaceId,
        entityType: {
          in: [
            SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
            SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
          ],
        },
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        media: {
          select: {
            id: true,
            storageKey: true,
            fileName: true,
            mimeType: true,
            status: true,
          },
        },
      },
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
  });
}
