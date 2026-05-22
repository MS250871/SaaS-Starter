import {
  claimOutboxEventForProcessing,
  createOutboxEvent,
  findOutboxEventByProcessingKey,
  markOutboxEventDone,
  scheduleOutboxEventRetry,
} from '@/modules/jobs/services/outbox-events.services';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { processNotificationDeliveryWorkflow } from '@/modules/notifications/workflows/process-notification-delivery.workflow';

const NOTIFICATION_SEND_DELIVERY_EVENT = 'notifications.send_delivery';

type QueueNotificationDeliveryParams = {
  notificationDeliveryId: string;
  workspaceId?: string | null;
  identityId?: string | null;
  customerId?: string | null;
};

type NotificationDeliveryOutboxPayload = {
  notificationDeliveryId: string;
};

function isNotificationDeliveryOutboxPayload(
  payload: unknown,
): payload is NotificationDeliveryOutboxPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'notificationDeliveryId' in payload
  );
}

export async function queueNotificationDelivery(
  params: QueueNotificationDeliveryParams,
) {
  if (!params.notificationDeliveryId) {
    throwError(
      ERR.INVALID_INPUT,
      'notificationDeliveryId is required',
    );
  }

  return createOutboxEvent({
    eventType: NOTIFICATION_SEND_DELIVERY_EVENT,
    payload: {
      notificationDeliveryId: params.notificationDeliveryId,
    },
    processingKey: `notifications:delivery:${params.notificationDeliveryId}`,
    workspaceId: params.workspaceId ?? undefined,
    identityId: params.identityId ?? undefined,
    customerId: params.customerId ?? undefined,
  });
}

export async function processNotificationDeliveryOutboxEvent(outboxEventId: string) {
  if (!outboxEventId) {
    throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');
  }

  const claimed = await withUnitOfWork(() =>
    claimOutboxEventForProcessing(outboxEventId),
  );

  if (claimed.eventType !== NOTIFICATION_SEND_DELIVERY_EVENT) {
    throwError(
      ERR.INVALID_INPUT,
      `Unsupported outbox event: ${claimed.eventType}`,
    );
  }

  if (!isNotificationDeliveryOutboxPayload(claimed.payload)) {
    throwError(ERR.INVALID_INPUT, 'Invalid notification delivery outbox payload');
  }

  try {
    const result = await processNotificationDeliveryWorkflow({
      notificationDeliveryId: claimed.payload.notificationDeliveryId,
    });

    await withUnitOfWork(() => markOutboxEventDone(claimed.id));
    return result;
  } catch (e) {
    await withUnitOfWork(() =>
      scheduleOutboxEventRetry(
        claimed.id,
        e instanceof Error ? e.message : 'Notification delivery failed',
      ),
    );
    throw e;
  }
}

export async function replayNotificationDeliveryOutboxEvent(
  processingKey: string,
) {
  if (!processingKey) {
    throwError(ERR.INVALID_INPUT, 'processingKey is required');
  }

  const event = await withUnitOfWork(() =>
    findOutboxEventByProcessingKey(processingKey),
  );

  if (!event) {
    throwError(ERR.NOT_FOUND, 'Outbox event not found');
  }

  return processNotificationDeliveryOutboxEvent(event.id);
}
