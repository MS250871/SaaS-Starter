import { createSystemJobRouteHandler } from '@/lib/http/create-system-job-route-handler';
import { processNotificationDeliveryOutboxEvent } from '@/modules/notifications/services/notification-outbox.services';
import { getOutboxEventById } from '@/modules/jobs/services/outbox-events.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export const dynamic = 'force-dynamic';

const notificationDeliveryWorkerRouteHandler = createSystemJobRouteHandler(
  async (req: Request) => {
    const body = (await req.json()) as {
      outboxEventId?: string;
    };

    if (!body.outboxEventId) {
      throwError(ERR.INVALID_INPUT, 'outboxEventId is required');
    }

    try {
      await processNotificationDeliveryOutboxEvent(body.outboxEventId);

      return {
        outboxEventId: body.outboxEventId,
        status: 'processed' as const,
      };
    } catch (error) {
      const outboxEvent = await getOutboxEventById(body.outboxEventId).catch(
        () => null,
      );

      if (
        outboxEvent?.status === 'FAILED' &&
        outboxEvent.nextRetryAt &&
        outboxEvent.jobId
      ) {
        return {
          outboxEventId: body.outboxEventId,
          status: 'retry_scheduled' as const,
        };
      }

      throw error;
    }
  },
  {
    requestContext: {
      path: '/api/worker/notifications/deliveries',
      method: 'POST',
    },
  },
);

export async function POST(req: Request) {
  return notificationDeliveryWorkerRouteHandler(req);
}
