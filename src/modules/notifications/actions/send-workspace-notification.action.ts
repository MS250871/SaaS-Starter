'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { assertPermission } from '@/modules/permissions/permissions.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { processNotificationDeliveryOutboxEvent } from '@/modules/notifications/notification-outbox.services';
import {
  sendWorkspaceNotificationActionSchema,
  type SendWorkspaceNotificationActionInput,
} from '@/modules/notifications/schema';
import { sendWorkspaceNotificationWorkflow } from '@/modules/notifications/workflows/send-workspace-notification.workflow';

function getSenderName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim();

  if (fullName) {
    return fullName;
  }

  return params.email ?? 'Workspace user';
}

const sendWorkspaceNotificationActionImpl = createTxAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: SendWorkspaceNotificationActionInput =
      sendWorkspaceNotificationActionSchema.parse(raw);

    const session = await getUserSession();

    if (!session?.identityId || !session.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'notification.create');

    const sender = await getIdentityDisplayProfile(session.identityId);

    const result = await sendWorkspaceNotificationWorkflow({
      workspaceId: session.workspaceId,
      senderIdentityId: session.identityId,
      senderName: getSenderName(sender ?? {}),
      input: parsed,
      payloadSource: 'workspace_notification_send',
      senderScope: 'workspace',
    });

    let deliveryFailures = 0;

    for (const event of result.outboxEvents) {
      try {
        await processNotificationDeliveryOutboxEvent(event.id);
      } catch (error) {
        deliveryFailures += 1;
        console.error('Workspace notification delivery failed:', error);
      }
    }

    const successMessage =
      result.outboxEvents.length === 0
        ? `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'}.`
        : deliveryFailures === 0
          ? `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} and all deliveries were processed.`
          : `Notification created for ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'}, but ${deliveryFailures} delivery attempt${deliveryFailures === 1 ? '' : 's'} failed.`;

    return {
      successMessage,
      recipientCount: result.recipientCount,
      deliveryFailures,
    };
  },
);

export async function sendWorkspaceNotificationAction(formData: FormData) {
  return sendWorkspaceNotificationActionImpl(formData);
}
