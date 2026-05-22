import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  addSupportTicketInternalNote,
  getPlatformManagedSupportTicketById,
} from '@/modules/support/services/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/services/support-attachments.services';

export async function addPlatformSupportTicketInternalNoteWorkflow(input: {
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

    const note = await addSupportTicketInternalNote({
      ticketId: ticket.id,
      workspaceId,
      senderId: input.senderIdentityId,
      message: input.message,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId,
      identityId: input.senderIdentityId,
      entityType: SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
      entityId: note.id,
    });

    return {
      ticketId: ticket.id,
      messageId: note.id,
      workspaceId,
      title: ticket.title,
    };
  });
}
