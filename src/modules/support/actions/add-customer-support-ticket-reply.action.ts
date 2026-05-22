'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  addCustomerSupportTicketReplyActionSchema,
  type AddCustomerSupportTicketReplyActionInput,
} from '@/modules/support/schema';
import { getSupportAttachmentFiles } from '@/modules/support/services/support-attachments.services';
import { addCustomerSupportTicketReplyWorkflow } from '@/modules/support/workflows/add-customer-support-ticket-reply.workflow';

const addCustomerSupportTicketReplyActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: AddCustomerSupportTicketReplyActionInput =
      addCustomerSupportTicketReplyActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.customerId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Customer session missing');
    }

    const result = await addCustomerSupportTicketReplyWorkflow({
      workspaceId: session.workspaceId,
      customerId: session.customerId,
      senderIdentityId: session.identityId,
      ticketId: parsed.ticketId,
      message: parsed.message,
      attachmentFiles: getSupportAttachmentFiles(formData),
    });

    return {
      successMessage: `Reply added to ${result.title}.`,
      ...result,
    };
  },
);

export async function addCustomerSupportTicketReplyAction(formData: FormData) {
  return addCustomerSupportTicketReplyActionImpl(formData);
}
