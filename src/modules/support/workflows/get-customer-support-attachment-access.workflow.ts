import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getCustomerSupportAttachmentAccess } from '@/modules/support/services/support-attachments.services';

export async function getCustomerSupportAttachmentAccessWorkflow(input: {
  workspaceId: string;
  customerId: string;
  mediaId: string;
}) {
  return withUnitOfWork(async () =>
    getCustomerSupportAttachmentAccess({
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      mediaId: input.mediaId,
    }),
  );
}
