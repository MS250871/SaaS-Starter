import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { addSupportTicketInternalNote } from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/workspace/services/workspace-support-attachments.services';

export async function addWorkspaceSupportTicketInternalNoteWorkflow(input: {
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

    const note = await addSupportTicketInternalNote({
      ticketId: ticket.id,
      workspaceId: input.workspaceId,
      senderId: input.senderIdentityId,
      message: input.message,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: input.workspaceId,
      identityId: input.senderIdentityId,
      entityType: SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
      entityId: note.id,
    });

    return {
      ticketId: ticket.id,
      messageId: note.id,
      title: ticket.title,
    };
  });
}
