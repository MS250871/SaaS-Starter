import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { isPlatformUser } from '@/modules/platform/services/membership.services';
import {
  assignSupportTicket,
  getPlatformManagedSupportTicketById,
  unassignSupportTicket,
} from '@/modules/support/support.services';

export async function updatePlatformSupportTicketAssignmentWorkflow(input: {
  ticketId: string;
  assignedToId: string | null;
}) {
  return withUnitOfWork(async () => {
    const ticket = await getPlatformManagedSupportTicketById(input.ticketId);

    let assigneeName: string | null = null;

    if (input.assignedToId) {
      const hasPlatformAccess = await isPlatformUser(input.assignedToId);

      if (!hasPlatformAccess) {
        throwError(
          ERR.NOT_FOUND,
          'The selected assignee is not an active platform operator.',
        );
      }

      await assignSupportTicket(ticket.id, input.assignedToId);

      const identity = await getIdentityDisplayProfile(input.assignedToId);
      assigneeName =
        `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() ||
        identity.email ||
        'Platform operator';
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
