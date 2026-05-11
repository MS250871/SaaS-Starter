import { SenderType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { addSupportTicketReply } from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/workspace/services/workspace-support-attachments.services';

export async function addWorkspaceSupportTicketReplyWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  senderIdentityId: string;
  message: string;
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
      },
    });

    if (!ticket || ticket.workspaceId !== input.workspaceId) {
      throwError(ERR.NOT_FOUND, 'Support ticket not found for this workspace');
    }

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
