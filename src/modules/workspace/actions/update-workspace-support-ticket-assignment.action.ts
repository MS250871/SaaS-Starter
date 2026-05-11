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
  updateWorkspaceSupportTicketAssignmentActionSchema,
  type UpdateWorkspaceSupportTicketAssignmentActionInput,
} from '@/modules/workspace/schema';
import { updateWorkspaceSupportTicketAssignmentWorkflow } from '@/modules/workspace/workflows/update-workspace-support-ticket-assignment.workflow';

function assertCanAssignSupportTicket(permissions: string[]) {
  if (
    hasPermission(permissions, 'supportTicket.assign') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  assertPermission(permissions, 'supportTicket.assign');
}

const updateWorkspaceSupportTicketAssignmentActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: UpdateWorkspaceSupportTicketAssignmentActionInput =
      updateWorkspaceSupportTicketAssignmentActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanAssignSupportTicket(session.permissions);

    const result = await updateWorkspaceSupportTicketAssignmentWorkflow({
      workspaceId: session.workspaceId,
      ticketId: parsed.ticketId,
      assignedToId:
        parsed.assignedToId === 'unassigned' ? null : parsed.assignedToId,
    });

    return {
      successMessage: result.assigneeName
        ? `Ticket assigned to ${result.assigneeName}.`
        : 'Ticket unassigned successfully.',
      ...result,
    };
  },
);

export async function updateWorkspaceSupportTicketAssignmentAction(
  formData: FormData,
) {
  return updateWorkspaceSupportTicketAssignmentActionImpl(formData);
}
