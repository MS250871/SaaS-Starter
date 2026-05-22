'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/services/permissions.services';
import {
  addWorkspaceSupportTicketReplyActionSchema,
  type AddWorkspaceSupportTicketReplyActionInput,
} from '@/modules/support/schema';
import { getSupportAttachmentFiles } from '@/modules/support/services/support-attachments.services';
import { addWorkspaceSupportTicketReplyWorkflow } from '@/modules/support/workflows/add-workspace-support-ticket-reply.workflow';

function assertCanReplyToSupportTicket(permissions: string[]) {
  if (
    hasPermission(permissions, 'supportTicket.reply') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  assertPermission(permissions, 'supportTicket.reply');
}

const addWorkspaceSupportTicketReplyActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: AddWorkspaceSupportTicketReplyActionInput =
      addWorkspaceSupportTicketReplyActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanReplyToSupportTicket(session.permissions);

    const result = await addWorkspaceSupportTicketReplyWorkflow({
      workspaceId: session.workspaceId,
      ticketId: parsed.ticketId,
      senderIdentityId: session.identityId,
      message: parsed.message,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage: `Reply added to ${result.title}.`,
      ...result,
    };
  },
);

export async function addWorkspaceSupportTicketReplyAction(formData: FormData) {
  return addWorkspaceSupportTicketReplyActionImpl(formData);
}
