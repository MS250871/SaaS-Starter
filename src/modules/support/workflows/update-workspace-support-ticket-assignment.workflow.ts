import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import {
  assignSupportTicket,
  getWorkspaceManagedSupportTicketById,
  unassignSupportTicket,
} from '@/modules/support/support.services';
import { findActiveWorkspaceMembershipByIdentity } from '@/modules/workspace/services/membership.services';

export async function updateWorkspaceSupportTicketAssignmentWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  assignedToId: string | null;
}) {
  return withUnitOfWork(async () => {
    const ticket = await getWorkspaceManagedSupportTicketById(
      input.workspaceId,
      input.ticketId,
    );

    let assigneeName: string | null = null;

    if (input.assignedToId) {
      const membership = await findActiveWorkspaceMembershipByIdentity(
        input.workspaceId,
        input.assignedToId,
      );

      if (!membership) {
        throwError(
          ERR.NOT_FOUND,
          'The selected assignee is not an active member of this workspace.',
        );
      }

      await assignSupportTicket(ticket.id, input.assignedToId);

      const identity = await getIdentityDisplayProfile(membership.identityId);
      assigneeName =
        `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() ||
        identity.email ||
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
