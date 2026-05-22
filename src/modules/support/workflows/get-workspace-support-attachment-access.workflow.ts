import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getWorkspaceSupportAttachmentAccess } from '@/modules/support/services/support-attachments.services';

export async function getWorkspaceSupportAttachmentAccessWorkflow(input: {
  workspaceId: string;
  mediaId: string;
}) {
  return withUnitOfWork(async () => {
    return getWorkspaceSupportAttachmentAccess(input);
  });
}
