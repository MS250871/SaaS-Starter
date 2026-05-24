'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  getMediaJobById,
  markMediaProcessing,
  requeueMediaJob,
} from '@/modules/media/services/media.services';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

const requeuePlatformMediaJobActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const mediaJobId = String(formData.get('mediaJobId') ?? '').trim();

    if (!mediaJobId) {
      throwError(ERR.INVALID_INPUT, 'Media job ID is required');
    }

    const job = await getMediaJobById(mediaJobId);
    await requeueMediaJob(job.id);
    await markMediaProcessing(job.mediaId);

    return {
      mediaJobId: job.id,
      successMessage: 'Media job requeued successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const mediaJobId = String(formData.get('mediaJobId') ?? '').trim();

        return {
          scope: 'PLATFORM' as const,
          category: 'MEDIA' as const,
          source: 'ADMIN_PANEL' as const,
          action: 'media.job.requeue',
          entityType: 'MediaJob',
          entityId: result.mediaJobId || mediaJobId,
          description: 'Media job requeued.',
        };
      },
    },
  },
);

export async function requeuePlatformMediaJobAction(formData: FormData) {
  return requeuePlatformMediaJobActionImpl(formData);
}
