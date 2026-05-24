'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  recordBillingPaymentFailureActionSchema,
  type RecordBillingPaymentFailureActionInput,
} from '@/modules/billing/schema';
import { recordBillingPaymentFailureWorkflow } from '@/modules/billing/workflows/record-billing-payment-failure.workflow';

function buildBillingFailureAuditInput(params: {
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    category: 'BILLING' as const,
    action: 'billing.payment.failure.record',
    entityType: 'Payment',
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

const recordBillingPaymentFailureActionImpl = createTxAction(
  async (input: RecordBillingPaymentFailureActionInput) => {
    const parsed = recordBillingPaymentFailureActionSchema.parse(input);
    const session = await getUserSession();

    if (!session?.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Login session missing');
    }

    const result = await recordBillingPaymentFailureWorkflow(
      {
        identityId: session.identityId,
        workspaceId: session.workspaceId,
      },
      parsed,
    );

    revalidatePath('/app/billing');

    return result;
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const input = args[0];

        return buildBillingFailureAuditInput({
          entityId: result.paymentId,
          description: result.message,
          metadata: {
            errorCode: input.errorCode ?? null,
            errorReason: input.errorReason ?? null,
            errorSource: input.errorSource ?? null,
            errorStep: input.errorStep ?? null,
            mode: input.mode,
          },
        });
      },
    },
  },
);

export async function recordBillingPaymentFailureAction(
  input: RecordBillingPaymentFailureActionInput,
) {
  return recordBillingPaymentFailureActionImpl(input);
}
