import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  addSupportTicketInternalNote,
  getWorkspaceManagedSupportTicketById,
} from '@/modules/support/services/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/services/support-attachments.services';

export async function addWorkspaceSupportTicketInternalNoteWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  senderIdentityId: string;
  message: string;
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    const ticket = await getWorkspaceManagedSupportTicketById(
      input.workspaceId,
      input.ticketId,
    );

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
