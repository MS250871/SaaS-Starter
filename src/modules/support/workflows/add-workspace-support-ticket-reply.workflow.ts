import { SenderType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  addSupportTicketReply,
  getWorkspaceSupportTicketById,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function addWorkspaceSupportTicketReplyWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  senderIdentityId: string;
  message: string;
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    const ticket = await getWorkspaceSupportTicketById(
      input.workspaceId,
      input.ticketId,
    );

    const message = await addSupportTicketReply({
      ticketId: ticket.id,
      workspaceId: input.workspaceId,
      senderType: SenderType.IDENTITY,
      senderId: input.senderIdentityId,
      message: input.message,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: input.workspaceId,
      identityId: input.senderIdentityId,
      entityType: SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
      entityId: message.id,
    });

    return {
      ticketId: ticket.id,
      messageId: message.id,
      title: ticket.title,
    };
  });
}
