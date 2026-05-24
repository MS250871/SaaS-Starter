'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import { getWorkspaceIdentityNotification } from '@/modules/notifications/services/notification.services';
import {
  markWorkspaceNotificationReadActionSchema,
  type MarkWorkspaceNotificationReadActionInput,
} from '@/modules/notifications/schema';
import { markNotificationReadWorkflow } from '@/modules/notifications/workflows/mark-notification-read.workflow';

const markWorkspaceNotificationReadActionImpl = createTxAction(
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
  {
    audit: {
      onSuccess: ({ result }) => ({
        scope: 'WORKSPACE' as const,
        category: 'NOTIFICATION' as const,
        source: 'WORKSPACE_APP' as const,
        action: 'workspace.notification.read',
        entityType: 'Notification',
        entityId: result.notificationId,
        description: 'Workspace notification marked as read.',
      }),
    },
  },
);

export async function markWorkspaceNotificationReadAction(formData: FormData) {
  return markWorkspaceNotificationReadActionImpl(formData);
}
