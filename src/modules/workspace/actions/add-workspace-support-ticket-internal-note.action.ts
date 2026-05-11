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
  addWorkspaceSupportTicketInternalNoteActionSchema,
  type AddWorkspaceSupportTicketInternalNoteActionInput,
} from '@/modules/workspace/schema';
import { getSupportAttachmentFiles } from '@/modules/workspace/services/workspace-support-attachments.services';
import { addWorkspaceSupportTicketInternalNoteWorkflow } from '@/modules/workspace/workflows/add-workspace-support-ticket-internal-note.workflow';

function assertCanAddSupportInternalNote(permissions: string[]) {
  if (
    hasPermission(permissions, 'supportTicket.internalNote') ||
    hasPermission(permissions, 'supportTicket.update')
  ) {
    return;
  }

  assertPermission(permissions, 'supportTicket.internalNote');
}

const addWorkspaceSupportTicketInternalNoteActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: AddWorkspaceSupportTicketInternalNoteActionInput =
      addWorkspaceSupportTicketInternalNoteActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanAddSupportInternalNote(session.permissions);

    const result = await addWorkspaceSupportTicketInternalNoteWorkflow({
      workspaceId: session.workspaceId,
      ticketId: parsed.ticketId,
      senderIdentityId: session.identityId,
      message: parsed.message,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage: `Internal note added to ${result.title}.`,
      ...result,
    };
  },
);

export async function addWorkspaceSupportTicketInternalNoteAction(
  formData: FormData,
) {
  return addWorkspaceSupportTicketInternalNoteActionImpl(formData);
}
