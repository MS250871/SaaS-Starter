import { NextResponse } from 'next/server';

import type { Prisma } from '@/generated/prisma/client';
import { handleError } from '@/lib/errors/app-error';
import { withPublicContext } from '@/lib/request/withPublicContext';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { upsertWebhookEvent } from '@/modules/integration/webhook-event.services';
import { processRazorpayWebhookEventWorkflow } from '@/modules/billing/workflows/process-razorpay-webhook.workflow';

type RazorpayWebhookEnvelope = {
  event?: string;
  created_at?: number;
};

export async function POST(request: Request) {
  try {
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

    await withPublicContext(async () => {
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

      await processRazorpayWebhookEventWorkflow(event.id);
    });

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    const err = handleError(error);

    return NextResponse.json(
      {
        received: false,
        error: err,
      },
      {
        status: err.status,
      },
    );
  }
}
