import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import {
  assignSupportTicket,
  unassignSupportTicket,
} from '@/modules/support/support.services';

export async function updateWorkspaceSupportTicketAssignmentWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  assignedToId: string | null;
}) {
  return withUnitOfWork(async () => {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!ticket || ticket.workspaceId !== input.workspaceId) {
      throwError(ERR.NOT_FOUND, 'Support ticket not found for this workspace');
    }

    let assigneeName: string | null = null;

    if (input.assignedToId) {
      const membership = await prisma.membership.findFirst({
        where: {
          workspaceId: input.workspaceId,
          identityId: input.assignedToId,
          isActive: true,
        },
        select: {
          identityId: true,
          identity: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!membership) {
        throwError(
          ERR.NOT_FOUND,
          'The selected assignee is not an active member of this workspace.',
        );
      }

      await assignSupportTicket(ticket.id, input.assignedToId);

      assigneeName =
        `${membership.identity.firstName ?? ''} ${membership.identity.lastName ?? ''}`.trim() ||
        membership.identity.email ||
        'Workspace member';
    } else {
      await unassignSupportTicket(ticket.id);
    }

    return {
      ticketId: ticket.id,
      assignedToId: input.assignedToId,
      assigneeName,
    };
  });
}
