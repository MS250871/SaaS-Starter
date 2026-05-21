'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/permissions.services';
import {
  updateWorkspaceSupportTicketStatusActionSchema,
  type UpdateWorkspaceSupportTicketStatusActionInput,
} from '@/modules/support/schema';
import { updateWorkspaceSupportTicketStatusWorkflow } from '@/modules/support/workflows/update-workspace-support-ticket-status.workflow';

function assertCanUpdateSupportStatus(
  permissions: string[],
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
) {
  if (status === 'closed' || status === 'resolved') {
    if (
      hasPermission(permissions, 'supportTicket.close') ||
      hasPermission(permissions, 'supportTicket.update')
    ) {
      return;
    }

    assertPermission(permissions, 'supportTicket.close');
    return;
  }

  if (
    hasPermission(permissions, 'supportTicket.reopen') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  assertPermission(permissions, 'supportTicket.update');
}

const updateWorkspaceSupportTicketStatusActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: UpdateWorkspaceSupportTicketStatusActionInput =
      updateWorkspaceSupportTicketStatusActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanUpdateSupportStatus(session.permissions, parsed.status);

    const result = await updateWorkspaceSupportTicketStatusWorkflow({
      workspaceId: session.workspaceId,
      ticketId: parsed.ticketId,
      status: parsed.status,
    });

    return {
      successMessage: `Ticket status updated to ${result.status}.`,
      ...result,
    };
  },
);

export async function updateWorkspaceSupportTicketStatusAction(
  formData: FormData,
) {
  return updateWorkspaceSupportTicketStatusActionImpl(formData);
}
