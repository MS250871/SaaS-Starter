import { SupportContextType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  createPlatformSupportTicket,
  createWorkspaceSupportTicket,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';

export async function createWorkspaceSupportTicketWorkflow(input: {
  workspaceId: string;
  createdById: string;
  target: 'workspace' | 'platform';
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    if (!input.workspaceId || !input.createdById) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
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
        : await createWorkspaceSupportTicket({
            workspaceId: input.workspaceId,
            createdById: input.createdById,
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
          : SupportContextType.WORKSPACE,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
    };
  });
}
