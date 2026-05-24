'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  createWorkspaceSupportTicketActionSchema,
  type CreateWorkspaceSupportTicketActionInput,
} from '@/modules/support/schema';
import { getSupportAttachmentFiles } from '@/modules/support/services/support-attachments.services';
import { createWorkspaceSupportTicketWorkflow } from '@/modules/support/workflows/create-workspace-support-ticket.workflow';

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
      customerId: parsed.customerId ?? null,
      title: parsed.title,
      body: parsed.body,
      priority: parsed.priority,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage:
        parsed.target === 'platform'
          ? 'Platform escalation created successfully.'
          : 'Customer support ticket created successfully.',
      ...result,
    };
  },
  {
    audit: {
      onSuccess: ({ result }) => ({
        scope: 'WORKSPACE',
        category: 'SUPPORT',
        source: 'WORKSPACE_APP',
        action:
          result.contextType === 'PLATFORM'
            ? 'workspace.support.escalation.create'
            : 'workspace.support.ticket.create',
        entityType: 'SupportTicket',
        entityId: result.ticketId,
        description:
          result.contextType === 'PLATFORM'
            ? 'Platform escalation created from workspace support.'
            : 'Customer support ticket created from workspace support.',
        newValue: {
          contextType: result.contextType,
          priority: result.priority,
          status: result.status,
        },
      }),
    },
  },
);

export async function createWorkspaceSupportTicketAction(formData: FormData) {
  return createWorkspaceSupportTicketActionImpl(formData);
}
