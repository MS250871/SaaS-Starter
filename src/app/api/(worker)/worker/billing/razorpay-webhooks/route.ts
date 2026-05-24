import { createSystemJobRouteHandler } from '@/lib/http/create-system-job-route-handler';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { processRazorpayWebhookEventWorkflow } from '@/modules/billing/workflows/process-razorpay-webhook.workflow';
import { getWebhookEventById } from '@/modules/integration/services/webhook-event.services';

export const dynamic = 'force-dynamic';

const razorpayWebhookWorkerRouteHandler = createSystemJobRouteHandler(
  async (req: Request) => {
    const body = (await req.json()) as {
      webhookEventId?: string;
    };

    if (!body.webhookEventId) {
      throwError(ERR.INVALID_INPUT, 'webhookEventId is required');
    }

    try {
      const result = await processRazorpayWebhookEventWorkflow(body.webhookEventId);

      return {
        webhookEventId: body.webhookEventId,
        status: result.status,
      };
    } catch (error) {
      const webhookEvent = await getWebhookEventById(body.webhookEventId).catch(
        () => null,
      );

      if (webhookEvent?.status === 'FAILED' && webhookEvent.nextRetryAt) {
        return {
          webhookEventId: body.webhookEventId,
          status: 'retry_scheduled' as const,
        };
      }

      throw error;
    }
  },
  {
    requestContext: {
      path: '/api/worker/billing/razorpay-webhooks',
      method: 'POST',
    },
    audit: {
      onSuccess: ({ result }) => {
        if (result.status !== 'processed') {
          return null;
        }

        return {
          scope: 'SYSTEM' as const,
          category: 'BILLING' as const,
          source: 'JOB' as const,
          action: 'billing.webhook.razorpay.process',
          entityType: 'WebhookEvent',
          entityId: result.webhookEventId,
          description: 'Razorpay webhook processed successfully.',
          metadata: {
            provider: 'razorpay',
            status: result.status,
          },
        };
      },
    },
  },
);

export async function POST(req: Request) {
  return razorpayWebhookWorkerRouteHandler(req);
}
