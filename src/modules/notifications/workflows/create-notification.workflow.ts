import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type { Prisma } from '@/generated/prisma/client';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationTargetType,
} from '@/generated/prisma/client';
import {
  createNotificationWithDeliveries,
  resolveNotificationRecipientForChannel,
  type CreateNotificationDeliveryInput,
} from '@/modules/notifications/services/notification.services';
import { queueNotificationDelivery } from '@/modules/notifications/services/notification-outbox.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type WorkflowDeliveryInput = {
  channel: NotificationChannel;
  recipient?: string | null;
  subject?: string | null;
  content?: string | null;
  payload?: Prisma.InputJsonValue;
  provider?: string | null;
};

export type CreateNotificationWorkflowInput = {
  workspaceId?: string | null;
  recipientIdentityId?: string | null;
  recipientCustomerId?: string | null;
  targetType: NotificationTargetType;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
  deliveries?: WorkflowDeliveryInput[];
};

export async function createNotificationWorkflow(
  input: CreateNotificationWorkflowInput,
) {
  return withUnitOfWork(async () => {
    if (!input.type) {
      throwError(ERR.INVALID_INPUT, 'Notification type is required');
    }

    if (!input.recipientIdentityId && !input.recipientCustomerId) {
      throwError(
        ERR.INVALID_INPUT,
        'Notification recipient identity or customer is required',
      );
    }

    const normalizedDeliveries: CreateNotificationDeliveryInput[] = [];

    for (const delivery of input.deliveries ?? []) {
      if (delivery.channel === NotificationChannel.WHATSAPP) {
        throwError(
          ERR.INVALID_STATE,
          'WhatsApp notifications are not implemented yet',
        );
      }

      const resolved =
        delivery.recipient?.trim()
          ? {
              recipient: delivery.recipient.trim(),
              provider: delivery.provider ?? null,
            }
          : await resolveNotificationRecipientForChannel({
              channel: delivery.channel,
              recipientIdentityId: input.recipientIdentityId ?? undefined,
              recipientCustomerId: input.recipientCustomerId ?? undefined,
            });

      const isImmediateInApp = delivery.channel === NotificationChannel.IN_APP;

      normalizedDeliveries.push({
        channel: delivery.channel,
        recipient: resolved.recipient,
        subject: delivery.subject ?? input.title ?? null,
        content: delivery.content ?? input.body ?? null,
        payload: delivery.payload ?? undefined,
        provider: delivery.provider ?? resolved.provider,
        status: isImmediateInApp
          ? NotificationDeliveryStatus.DELIVERED
          : NotificationDeliveryStatus.PENDING,
      });
    }

    const result = await createNotificationWithDeliveries({
      workspaceId: input.workspaceId ?? undefined,
      recipientIdentityId: input.recipientIdentityId ?? undefined,
      recipientCustomerId: input.recipientCustomerId ?? undefined,
      targetType: input.targetType,
      type: input.type,
      title: input.title ?? null,
      body: input.body ?? null,
      payload: input.payload ?? {},
      deliveries: normalizedDeliveries,
    });

    const queuedOutboxEvents = [];

    for (const delivery of result.deliveries) {
      if (delivery.channel === NotificationChannel.IN_APP) {
        continue;
      }

      const outboxEvent = await queueNotificationDelivery({
        notificationDeliveryId: delivery.id,
        workspaceId: result.notification.workspaceId ?? undefined,
        identityId: result.notification.recipientIdentityId ?? undefined,
        customerId: result.notification.recipientCustomerId ?? undefined,
      });

      queuedOutboxEvents.push(outboxEvent);
    }

    return {
      notification: result.notification,
      deliveries: result.deliveries,
      outboxEvents: queuedOutboxEvents,
    };
  });
}
