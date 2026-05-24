import type { Prisma } from '@/generated/prisma/client';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createWebhookRouteHandler } from '@/lib/http/create-webhook-route-handler';
import { upsertWebhookEvent } from '@/modules/integration/services/webhook-event.services';
import {
  dispatchRazorpayWebhookJob,
  shouldBypassQStashDispatch,
} from '@/modules/jobs/services/qstash-job-dispatch.services';
import { processRazorpayWebhookEventWorkflow } from '@/modules/billing/workflows/process-razorpay-webhook.workflow';

type RazorpayWebhookEnvelope = {
  event?: string;
  created_at?: number;
};

const razorpayWebhookRouteHandler = createWebhookRouteHandler(
  async (request: Request) => {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const externalId = request.headers.get('x-razorpay-event-id');

    if (!signature) {
      throwError(ERR.UNAUTHORIZED, 'Missing Razorpay webhook signature.');
    }

    if (!verifyRazorpayWebhookSignature({ rawBody, signature })) {
      throwError(ERR.UNAUTHORIZED, 'Invalid Razorpay webhook signature.');
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookEnvelope;

    if (!payload.event) {
      throwError(ERR.INVALID_INPUT, 'Webhook event type is missing.');
    }

    const eventType = payload.event;
    const resolvedExternalId =
      externalId ?? `${eventType}-${payload.created_at ?? Date.now()}`;
    const jsonPayload = payload as Prisma.InputJsonValue;

    const event = await upsertWebhookEvent(
      {
        provider: 'razorpay',
        eventType,
        externalId: resolvedExternalId,
        payload: jsonPayload,
        status: 'RECEIVED',
      },
      {
        payload: jsonPayload,
        eventType,
      },
    );

    const result = shouldBypassQStashDispatch()
      ? await processRazorpayWebhookEventWorkflow(event.id)
      : await (async () => {
          await dispatchRazorpayWebhookJob({
            webhookEventId: event.id,
          });

          return {
            webhookEventId: event.id,
            status: 'queued' as const,
          };
        })();

    return {
      received: true,
      eventType,
      externalId: resolvedExternalId,
      webhookEventId: result.webhookEventId,
      status: result.status,
    };
  },
  {
    requestContext: {
      path: '/api/public/razorpay/webhook',
      method: 'POST',
    },
    rateLimit: {
      byIp: {
        limit: 300,
        windowSeconds: 60,
        message: 'Too many Razorpay webhook requests. Please retry later.',
      },
    },
    buildSuccessResponse: () =>
      Response.json({
        received: true,
      }),
    buildErrorResponse: (error) =>
      Response.json(
        {
          received: false,
          error,
        },
        {
          status: error.status,
        },
      ),
    audit: {
      onError: ({ error }) => {
        if (error.status !== 401 && error.status !== 403) {
          return null;
        }

        return {
          scope: 'SYSTEM' as const,
          category: 'SECURITY' as const,
          source: 'WEBHOOK' as const,
          outcome: 'DENIED' as const,
          severity: 'WARNING' as const,
          action: 'billing.webhook.razorpay.reject',
          entityType: 'WebhookRequest',
          description: error.message,
          reason: error.code,
          metadata: {
            provider: 'razorpay',
          },
        };
      },
    },
  },
);

export async function POST(request: Request) {
  return razorpayWebhookRouteHandler(request);
}
