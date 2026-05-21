import { SupportContextType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getWorkspaceCustomerById } from '@/modules/customer/services/customer.services';
import {
  createCustomerSupportTicket,
  createPlatformSupportTicket,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function createWorkspaceSupportTicketWorkflow(input: {
  workspaceId: string;
  createdById: string;
  target: 'customer' | 'platform';
  customerId?: string | null;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    if (!input.workspaceId || !input.createdById) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    if (input.target === 'customer' && !input.customerId) {
      throwError(ERR.INVALID_INPUT, 'Customer is required');
    }

    if (input.target === 'customer' && input.customerId) {
      await getWorkspaceCustomerById(input.workspaceId, input.customerId);
    }

    const ticket =
      input.target === 'platform'
        ? await createPlatformSupportTicket({
            workspaceId: input.workspaceId,
            createdById: input.createdById,
            title: input.title,
            body: input.body,
            priority: input.priority,
          })
        : await createCustomerSupportTicket({
            workspaceId: input.workspaceId,
            customerId: input.customerId!,
            title: input.title,
            body: input.body,
            priority: input.priority,
          });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: input.workspaceId,
      identityId: input.createdById,
      entityType: SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      entityId: ticket.id,
    });

    return {
      ticketId: ticket.id,
      contextType:
        input.target === 'platform'
          ? SupportContextType.PLATFORM
          : SupportContextType.CUSTOMER,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
    };
  });
}
