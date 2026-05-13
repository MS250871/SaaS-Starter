'use server';

import { createAction } from '@/lib/http/create-action';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { assertPermission } from '@/modules/permissions/permissions.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { markAllNotificationsReadWorkflow } from '@/modules/notifications/workflows/mark-notification-read.workflow';

const markAllWorkspaceNotificationsReadActionImpl = createAction(
  async () => {
    const session = await getUserSession();

    if (!session?.identityId || !session.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'notification.markRead');

    await markAllNotificationsReadWorkflow({
      identityId: session.identityId,
    });

    return {
      successMessage: 'All notifications marked as read.',
    };
  },
);

export async function markAllWorkspaceNotificationsReadAction() {
  return markAllWorkspaceNotificationsReadActionImpl();
}
