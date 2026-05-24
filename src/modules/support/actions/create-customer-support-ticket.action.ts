'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  createCustomerSupportTicketActionSchema,
  type CreateCustomerSupportTicketActionInput,
} from '@/modules/support/schema';
import { getSupportAttachmentFiles } from '@/modules/support/services/support-attachments.services';
import { createCustomerSupportTicketWorkflow } from '@/modules/support/workflows/create-customer-support-ticket.workflow';

const createCustomerSupportTicketActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreateCustomerSupportTicketActionInput =
      createCustomerSupportTicketActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.customerId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Customer session missing');
    }

    const result = await createCustomerSupportTicketWorkflow({
      workspaceId: session.workspaceId,
      customerId: session.customerId,
      createdById: session.identityId,
      title: parsed.title,
      body: parsed.body,
      priority: parsed.priority,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage: 'Support ticket created successfully.',
      ...result,
    };
  },
  {
    audit: {
      onSuccess: ({ result }) => ({
        scope: 'CUSTOMER',
        category: 'SUPPORT',
        source: 'CUSTOMER_APP',
        action: 'customer.support.ticket.create',
        entityType: 'SupportTicket',
        entityId: result.ticketId,
        description: 'Support ticket created by customer.',
        newValue: {
          contextType: result.contextType,
          priority: result.priority,
          status: result.status,
        },
      }),
    },
  },
);

export async function createCustomerSupportTicketAction(formData: FormData) {
  return createCustomerSupportTicketActionImpl(formData);
}
