'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  createWorkspaceSupportTicketActionSchema,
  type CreateWorkspaceSupportTicketActionInput,
} from '@/modules/workspace/schema';
import { getSupportAttachmentFiles } from '@/modules/workspace/services/workspace-support-attachments.services';
import { createWorkspaceSupportTicketWorkflow } from '@/modules/workspace/workflows/create-workspace-support-ticket.workflow';

const createWorkspaceSupportTicketActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreateWorkspaceSupportTicketActionInput =
      createWorkspaceSupportTicketActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'supportTicket.create');

    const result = await createWorkspaceSupportTicketWorkflow({
      workspaceId: session.workspaceId,
      createdById: session.identityId,
      target: parsed.target,
      title: parsed.title,
      body: parsed.body,
      priority: parsed.priority,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage:
        parsed.target === 'platform'
          ? 'Platform escalation created successfully.'
          : 'Workspace support ticket created successfully.',
      ...result,
    };
  },
);

export async function createWorkspaceSupportTicketAction(formData: FormData) {
  return createWorkspaceSupportTicketActionImpl(formData);
}
