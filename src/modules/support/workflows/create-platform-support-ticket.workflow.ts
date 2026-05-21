import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  createPlatformSupportTicket,
} from '@/modules/support/support.services';
import {
  createSupportAttachments,
  SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
} from '@/modules/support/support-attachments.services';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';

export async function createPlatformSupportTicketWorkflow(input: {
  workspaceId: string;
  createdById: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachmentFiles?: File[];
}) {
  return withUnitOfWork(async () => {
    if (!input.workspaceId || !input.createdById) {
      throwError(ERR.UNAUTHORIZED, 'Platform session missing');
    }

    const workspace = await getWorkspaceById(input.workspaceId);

    const ticket = await createPlatformSupportTicket({
      workspaceId: workspace.id,
      createdById: input.createdById,
      title: input.title,
      body: input.body,
      priority: input.priority,
    });

    await createSupportAttachments({
      files: input.attachmentFiles ?? [],
      workspaceId: workspace.id,
      identityId: input.createdById,
      entityType: SUPPORT_TICKET_ATTACHMENT_ENTITY_TYPE,
      entityId: ticket.id,
    });

    return {
      ticketId: ticket.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      title: ticket.title,
      status: ticket.status,
    };
  });
}
