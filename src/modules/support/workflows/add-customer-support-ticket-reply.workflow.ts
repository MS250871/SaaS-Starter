import { SenderType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  addSupportTicketReply,
  getCustomerSupportTicketById,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_MESSAGE_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function addCustomerSupportTicketReplyWorkflow(input: {
  workspaceId: string;
  customerId: string;
  senderIdentityId: string;
  ticketId: string;
  message: string;
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    const ticket = await getCustomerSupportTicketById({
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      ticketId: input.ticketId,
    });

    const message = await addSupportTicketReply({
      ticketId: ticket.id,
      workspaceId: input.workspaceId,
      senderType: SenderType.CUSTOMER,
      senderId: input.customerId,
      message: input.message,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: input.workspaceId,
      identityId: input.senderIdentityId,
      customerId: input.customerId,
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
