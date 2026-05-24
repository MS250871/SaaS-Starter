'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { getNotificationDeliveryById } from '@/modules/notifications/services/notification.services';
import {
  dispatchNotificationDeliveryOutboxEvent,
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

function buildNotificationAuditInput(params: {
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'NOTIFICATION' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata ?? undefined,
  };
}

const replayPlatformNotificationDeliveryActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const deliveryId = String(formData.get('deliveryId') ?? '').trim();

    if (!deliveryId) {
      throwError(ERR.INVALID_INPUT, 'Notification delivery ID is required');
    }

    const delivery = await getNotificationDeliveryById(deliveryId);
    await replayNotificationDeliveryOutboxEvent(
      `notifications:delivery:${delivery.id}`,
    );

    return {
      deliveryId: delivery.id,
      successMessage: 'Notification delivery replay requested successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const deliveryId = String(formData.get('deliveryId') ?? '').trim();

        return buildNotificationAuditInput({
          action: 'notification.delivery.replay',
          entityType: 'NotificationDelivery',
          entityId: result.deliveryId || deliveryId,
          description: 'Notification delivery replay requested.',
        });
      },
    },
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

    let queueFailures = 0;

    for (const event of result.outboxEvents) {
      try {
        await dispatchNotificationDeliveryOutboxEvent(event.id);
      } catch (error) {
        queueFailures += 1;
        console.error('Platform notification queue publish failed:', error);
      }
    }

    const successMessage =
      result.outboxEvents.length === 0
        ? `Notification sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}.`
        : queueFailures === 0
          ? `Notification queued for ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}.`
          : `Notification created for ${result.recipientCount} recipient${result.recipientCount === 1 ? '' : 's'} in ${workspace.name}, but ${queueFailures} delivery queue attempt${queueFailures === 1 ? '' : 's'} failed.`;

    return {
      workspaceId: workspace.id,
      recipientCount: result.recipientCount,
      deliveryFailures: queueFailures,
      successMessage,
    };
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildNotificationAuditInput({
          action: 'notification.workspace.send',
          entityType: 'Workspace',
          entityId: result.workspaceId,
          description: `Notification queued for ${result.recipientCount} recipient${
            result.recipientCount === 1 ? '' : 's'
          }.`,
          metadata: {
            deliveryFailures: result.deliveryFailures,
            recipientCount: result.recipientCount,
          },
        }),
    },
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
