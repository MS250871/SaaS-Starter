import { withUnitOfWork } from '@/lib/context/unit-of-work';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  countPaymentAttempts,
  createPaymentAttempt,
  getPaymentById,
  updatePayment,
} from '@/modules/billing/services/payment.services';
import type { RecordBillingPaymentFailureActionInput } from '@/modules/billing/schema';

type RecordBillingPaymentFailureContext = {
  identityId: string;
  workspaceId?: string;
};

export type RecordBillingPaymentFailureResult = {
  paymentId: string;
  status: 'FAILED';
  message: string;
};

function toJsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function recordBillingPaymentFailureWorkflow(
  context: RecordBillingPaymentFailureContext,
  input: RecordBillingPaymentFailureActionInput,
): Promise<RecordBillingPaymentFailureResult> {
  const localPayment = await withUnitOfWork(() => getPaymentById(input.paymentId));

  if (localPayment.identityId !== context.identityId) {
    throwError(ERR.FORBIDDEN, 'This payment does not belong to the current identity.');
  }

  const nextMetadata = {
    ...(localPayment.metadata && typeof localPayment.metadata === 'object'
      ? (localPayment.metadata as Record<string, unknown>)
      : {}),
    providerOrderId: input.razorpayOrderId ?? localPayment.providerOrderId ?? null,
    providerSubscriptionId: input.razorpaySubscriptionId ?? null,
    providerPaymentStatus: 'failed',
    failure: {
      code: input.errorCode ?? null,
      description: input.errorDescription,
      source: input.errorSource ?? null,
      step: input.errorStep ?? null,
      reason: input.errorReason ?? null,
    },
  };

  await withUnitOfWork(() =>
    updatePayment(localPayment.id, {
      providerPaymentId: input.razorpayPaymentId ?? localPayment.providerPaymentId ?? undefined,
      providerOrderId: input.razorpayOrderId ?? localPayment.providerOrderId ?? undefined,
      paymentStatus: 'FAILED',
      metadata: nextMetadata,
    }),
  );

  const attemptNumber = (await withUnitOfWork(() => countPaymentAttempts(localPayment.id))) + 1;

  await withUnitOfWork(() =>
    createPaymentAttempt({
      paymentId: localPayment.id,
      attemptNumber,
      provider: 'RAZORPAY',
      status: 'failed',
      errorCode: input.errorCode ?? undefined,
      errorMessage: input.errorDescription,
      responsePayload: toJsonInput({
        mode: input.mode,
        razorpayPaymentId: input.razorpayPaymentId ?? null,
        razorpayOrderId: input.razorpayOrderId ?? null,
        razorpaySubscriptionId: input.razorpaySubscriptionId ?? null,
        error: {
          code: input.errorCode ?? null,
          description: input.errorDescription,
          source: input.errorSource ?? null,
          step: input.errorStep ?? null,
          reason: input.errorReason ?? null,
        },
      }),
    }),
  );

  return {
    paymentId: localPayment.id,
    status: 'FAILED',
    message:
      input.mode === 'subscription'
        ? 'Subscription payment was marked as failed.'
        : 'Payment was marked as failed.',
  };
}
