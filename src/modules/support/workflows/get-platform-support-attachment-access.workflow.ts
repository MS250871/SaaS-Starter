import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getPlatformSupportAttachmentAccess } from '@/modules/support/services/support-attachments.services';

export async function getPlatformSupportAttachmentAccessWorkflow(input: {
  mediaId: string;
}) {
  return withUnitOfWork(async () =>
    getPlatformSupportAttachmentAccess({
      mediaId: input.mediaId,
    }),
  );
}
