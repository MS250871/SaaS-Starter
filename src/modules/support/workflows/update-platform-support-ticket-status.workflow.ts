import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  getPlatformManagedSupportTicketById,
  updateSupportTicketStatus,
} from '@/modules/support/services/support.services';

export async function updatePlatformSupportTicketStatusWorkflow(input: {
  ticketId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}) {
  return withUnitOfWork(async () => {
    const ticket = await getPlatformManagedSupportTicketById(input.ticketId);
    const updated = await updateSupportTicketStatus(ticket.id, input.status);

    return {
      ticketId: updated.id,
      status: updated.status,
      title: updated.title,
      contextType: ticket.contextType,
    };
  });
}
