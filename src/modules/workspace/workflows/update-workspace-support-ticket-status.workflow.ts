import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { updateSupportTicketStatus } from '@/modules/support/support.services';

export async function updateWorkspaceSupportTicketStatusWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}) {
  return withUnitOfWork(async () => {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        status: true,
        contextType: true,
      },
    });

    if (!ticket || ticket.workspaceId !== input.workspaceId) {
      throwError(ERR.NOT_FOUND, 'Support ticket not found for this workspace');
    }

    const updated = await updateSupportTicketStatus(ticket.id, input.status);

    return {
      ticketId: updated.id,
      status: updated.status,
      title: updated.title,
      contextType: ticket.contextType,
    };
  });
}
