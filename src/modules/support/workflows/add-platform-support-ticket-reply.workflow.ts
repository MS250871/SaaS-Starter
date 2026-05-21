import { SenderType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  addSupportTicketReply,
  getPlatformManagedSupportTicketById,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function addPlatformSupportTicketReplyWorkflow(input: {
  ticketId: string;
  senderIdentityId: string;
  message: string;
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    const ticket = await getPlatformManagedSupportTicketById(input.ticketId);
    const workspaceId = ticket.workspaceId;

    if (!workspaceId) {
      throwError(ERR.INVALID_STATE, 'Support ticket is missing a workspace');
    }

    const message = await addSupportTicketReply({
      ticketId: ticket.id,
      workspaceId,
      senderType: SenderType.IDENTITY,
      senderId: input.senderIdentityId,
      message: input.message,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId,
      identityId: input.senderIdentityId,
      entityType: SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
      entityId: message.id,
    });

    return {
      ticketId: ticket.id,
      messageId: message.id,
      workspaceId,
      title: ticket.title,
    };
  });
}
