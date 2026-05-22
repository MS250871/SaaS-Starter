import { createRouteHandler } from '@/lib/http/create-route-handler';
import { withSystemJobContext } from '@/lib/request/withSystemJobContext';
import { processNotificationDeliveryOutboxEvent } from '@/modules/notifications/services/notification-outbox.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export const dynamic = 'force-dynamic';

const notificationDeliveryWorkerRouteHandler = createRouteHandler(
  async (req: Request) => {
    const body = (await req.json()) as {
      outboxEventId?: string;
    };

    if (!body.outboxEventId) {
      throwError(ERR.INVALID_INPUT, 'outboxEventId is required');
    }

    return withSystemJobContext(() =>
      processNotificationDeliveryOutboxEvent(body.outboxEventId!),
    );
  },
);

export async function POST(req: Request) {
  return notificationDeliveryWorkerRouteHandler(req);
}
