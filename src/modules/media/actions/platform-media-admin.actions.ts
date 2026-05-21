'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/audit.services';
import {
  getMediaJobById,
  markMediaProcessing,
  requeueMediaJob,
} from '@/modules/media/media.services';
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
    const session = await requirePlatformAdminSession();
    const mediaJobId = String(formData.get('mediaJobId') ?? '').trim();

    if (!mediaJobId) {
      throwError(ERR.INVALID_INPUT, 'Media job ID is required');
    }

    const job = await getMediaJobById(mediaJobId);
    await requeueMediaJob(job.id);
    await markMediaProcessing(job.mediaId);

    const requestContext = getRequestContext();
    await logAdminAction({
      adminIdentityId: session.identityId,
      adminEmail: null,
      adminRole: session.platformRoleSystemKeys?.[0] ?? null,
      action: 'media.job.requeue',
      entityType: 'MediaJob',
      entityId: job.id,
      description: `Media job ${job.jobType} requeued for media ${job.mediaId}.`,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
    });

    return {
      mediaJobId: job.id,
      successMessage: 'Media job requeued successfully.',
    };
  },
);

export async function requeuePlatformMediaJobAction(formData: FormData) {
  return requeuePlatformMediaJobActionImpl(formData);
}
