import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  getWorkspaceManagedSupportTicketById,
  updateSupportTicketStatus,
} from '@/modules/support/services/support.services';

export async function updateWorkspaceSupportTicketStatusWorkflow(input: {
  workspaceId: string;
  ticketId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}) {
  return withUnitOfWork(async () => {
    const ticket = await getWorkspaceManagedSupportTicketById(
      input.workspaceId,
      input.ticketId,
    );

    const updated = await updateSupportTicketStatus(ticket.id, input.status);

    return {
      ticketId: updated.id,
      status: updated.status,
      title: updated.title,
      contextType: ticket.contextType,
    };
  });
}
