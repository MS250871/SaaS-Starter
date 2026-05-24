import { createSystemJobRouteHandler } from '@/lib/http/create-system-job-route-handler';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { getOutboxEventById } from '@/modules/jobs/services/outbox-events.services';

export const dynamic = 'force-dynamic';

const otpDeliveryWorkerRouteHandler = createSystemJobRouteHandler(
  async (req: Request) => {
    const body = (await req.json()) as {
      outboxEventId?: string;
    };

    if (!body.outboxEventId) {
      throwError(ERR.INVALID_INPUT, 'outboxEventId is required');
    }

    try {
      await processOtpOutboxEvent(body.outboxEventId);

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
      path: '/api/worker/auth/otp-deliveries',
      method: 'POST',
    },
  },
);

export async function POST(req: Request) {
  return otpDeliveryWorkerRouteHandler(req);
}
