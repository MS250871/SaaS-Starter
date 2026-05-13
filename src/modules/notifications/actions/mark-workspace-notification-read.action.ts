'use server';

import { createAction } from '@/lib/http/create-action';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { assertPermission } from '@/modules/permissions/permissions.services';
import { getWorkspaceIdentityNotification } from '@/modules/notifications/notification.services';
import {
  markWorkspaceNotificationReadActionSchema,
  type MarkWorkspaceNotificationReadActionInput,
} from '@/modules/workspace/schema';
import { markNotificationReadWorkflow } from '@/modules/notifications/workflows/mark-notification-read.workflow';

const markWorkspaceNotificationReadActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: MarkWorkspaceNotificationReadActionInput =
      markWorkspaceNotificationReadActionSchema.parse(raw);

    const session = await getUserSession();

    if (!session?.identityId || !session.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'notification.markRead');

    const notification = await getWorkspaceIdentityNotification(
      session.workspaceId,
      session.identityId,
      parsed.notificationId,
    );

    await markNotificationReadWorkflow(notification.id);

    return {
      successMessage: 'Notification marked as read.',
      notificationId: notification.id,
    };
  },
);

export async function markWorkspaceNotificationReadAction(formData: FormData) {
  return markWorkspaceNotificationReadActionImpl(formData);
}
