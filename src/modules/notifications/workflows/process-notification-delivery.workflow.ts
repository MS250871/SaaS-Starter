import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/generated/prisma/client';
import { sendMail } from '@/lib/email/transport';
import { sendSMS } from '@/lib/sms/transport-sms';
import {
  getNotificationDeliveryById,
  markNotificationDeliveryDelivered,
  markNotificationDeliveryFailed,
  markNotificationDeliveryProcessing,
  markNotificationDeliverySent,
} from '@/modules/notifications/notification.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type SmsDeliveryPayload = {
  templateId?: string;
};

function getSmsPayload(value: unknown): SmsDeliveryPayload {
  return typeof value === 'object' && value !== null
    ? (value as SmsDeliveryPayload)
    : {};
}

export async function processNotificationDeliveryWorkflow(params: {
  notificationDeliveryId: string;
}) {
  return withUnitOfWork(async () => {
    if (!params.notificationDeliveryId) {
      throwError(
        ERR.INVALID_INPUT,
        'Notification delivery ID is required',
      );
    }

    const delivery = await getNotificationDeliveryById(params.notificationDeliveryId);

    if (
      delivery.status === NotificationDeliveryStatus.DELIVERED ||
      delivery.status === NotificationDeliveryStatus.CANCELLED
    ) {
      return delivery;
    }

    await markNotificationDeliveryProcessing(delivery.id);

    try {
      if (delivery.channel === NotificationChannel.IN_APP) {
        return await markNotificationDeliveryDelivered({
          id: delivery.id,
          providerMessageId: null,
        });
      }

      if (delivery.channel === NotificationChannel.EMAIL) {
        if (!delivery.subject || !delivery.content) {
          throwError(
            ERR.INVALID_INPUT,
            'Email delivery requires subject and content',
          );
        }

        await sendMail({
          to: delivery.recipient,
          subject: delivery.subject,
          html: delivery.content,
        });

        return await markNotificationDeliverySent({
          id: delivery.id,
          providerMessageId: null,
        });
      }

      if (delivery.channel === NotificationChannel.SMS) {
        if (!delivery.content) {
          throwError(ERR.INVALID_INPUT, 'SMS delivery requires content');
        }

        const smsPayload = getSmsPayload(delivery.payload);

        if (!smsPayload.templateId) {
          throwError(
            ERR.INVALID_INPUT,
            'SMS delivery payload requires templateId',
          );
        }

        await sendSMS({
          numbers: [delivery.recipient],
          message: delivery.content,
          templateId: smsPayload.templateId,
        });

        return await markNotificationDeliverySent({
          id: delivery.id,
          providerMessageId: null,
        });
      }

      throwError(
        ERR.INVALID_STATE,
        `Notification delivery channel ${delivery.channel} is not implemented`,
      );
    } catch (e) {
      await markNotificationDeliveryFailed({
        id: delivery.id,
        errorMessage:
          e instanceof Error ? e.message : 'Notification delivery failed',
      });
      throw e;
    }
  });
}
