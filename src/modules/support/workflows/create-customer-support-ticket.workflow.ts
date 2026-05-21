import { SupportContextType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createCustomerSupportTicket } from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function createCustomerSupportTicketWorkflow(input: {
  workspaceId: string;
  customerId: string;
  createdById: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    if (!input.workspaceId || !input.customerId || !input.createdById) {
      throwError(ERR.UNAUTHORIZED, 'Customer session missing');
    }

    const ticket = await createCustomerSupportTicket({
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      title: input.title,
      body: input.body,
      priority: input.priority,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: input.workspaceId,
      identityId: input.createdById,
      customerId: input.customerId,
      entityType: SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      entityId: ticket.id,
    });

    return {
      ticketId: ticket.id,
      contextType: SupportContextType.CUSTOMER,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
    };
  });
}
