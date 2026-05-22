'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { logAdminAction } from '@/modules/audit/services/audit.services';
import { getNotificationDeliveryById } from '@/modules/notifications/services/notification.services';
import {
  processNotificationDeliveryOutboxEvent,
  replayNotificationDeliveryOutboxEvent,
} from '@/modules/notifications/services/notification-outbox.services';
import {
  sendPlatformWorkspaceNotificationActionSchema,
  type SendPlatformWorkspaceNotificationActionInput,
} from '@/modules/notifications/schema';
import { sendWorkspaceNotificationWorkflow } from '@/modules/notifications/workflows/send-workspace-notification.workflow';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

function getSenderName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim();

  if (fullName) {
    return fullName;
  }

  return params.email ?? 'Platform operator';
}

const replayPlatformNotificationDeliveryActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const deliveryId = String(formData.get('deliveryId') ?? '').trim();

    if (!deliveryId) {
      throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
    }

    const delivery = await getNotificationDeliveryById(deliveryId);
    await replayNotificationDeliveryOutboxEvent(
      `notifications:delivery:${delivery.id}`,
    );

    const requestContext = getRequestContext();
    await logAdminAction({
      adminIdentityId: session.identityId,
      adminEmail: null,
      adminRole: session.platformRoleSystemKeys?.[0] ?? null,
      action: 'notification.delivery.replay',
      entityType: 'NotificationDelivery',
      entityId: delivery.id,
      description: `Notification delivery replay requested for ${delivery.channel}.`,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
    });

    return {
      deliveryId: delivery.id,
      successMessage: 'Notification delivery replay requested successfully.',
    };
  },
);

const sendPlatformWorkspaceNotificationActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: SendPlatformWorkspaceNotificationActionInput =
      sendPlatformWorkspaceNotificationActionSchema.parse(raw);

    const [sender, workspace] = await Promise.all([
      getIdentityDisplayProfile(session.identityId),
      getWorkspaceById(parsed.workspaceId),
    ]);

    const result = await sendWorkspaceNotificationWorkflow({
      workspaceId: parsed.workspaceId,
      senderIdentityId: session.identityId,
      senderName: getSenderName(sender),
      input: {
        audience: parsed.audience,
        deliveryChannel: parsed.deliveryChannel,
        recipientMode: parsed.recipientMode,
        recipientId: parsed.recipientId,
        title: parsed.title,
        body: parsed.body,
      },
      payloadSource: 'platform_notification_send',
      senderScope: 'platform',
    });

    let deliveryFailures = 0;

    for (const event of result.outboxEvents) {
      try {
        await processNotificationDeliveryOutboxEvent(event.id);
      } catch (error) {
        deliveryFailures += 1;
        console.error('Platform notification delivery failed:', error);
      }
    }

    const requestContext = getRequestContext();
    await logAdminAction({
      adminIdentityId: session.identityId,
      adminEmail: sender.email ?? null,
      adminRole: session.platformRoleSystemKeys?.[0] ?? null,
      action: 'notification.workspace.send',
      entityType: 'Workspace',
      entityId: workspace.id,
      description: `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in workspace ${workspace.name}.`,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
    });

    const successMessage =
      result.outboxEvents.length === 0
        ? `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}.`
        : deliveryFailures === 0
          ? `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}, and all deliveries were processed.`
          : `Notification created for ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}, but ${deliveryFailures} delivery attempt${deliveryFailures === 1 ? '' : 's'} failed.`;

    return {
      workspaceId: workspace.id,
      recipientCount: result.recipientCount,
      deliveryFailures,
      successMessage,
    };
  },
);

export async function replayPlatformNotificationDeliveryAction(formData: FormData) {
  return replayPlatformNotificationDeliveryActionImpl(formData);
}

export async function sendPlatformWorkspaceNotificationAction(
  formData: FormData,
) {
  return sendPlatformWorkspaceNotificationActionImpl(formData);
}
