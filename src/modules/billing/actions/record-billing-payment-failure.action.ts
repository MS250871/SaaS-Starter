'use server';

import { revalidatePath } from 'next/cache';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  recordBillingPaymentFailureActionSchema,
  type RecordBillingPaymentFailureActionInput,
} from '@/modules/billing/schema';
import { recordBillingPaymentFailureWorkflow } from '@/modules/billing/workflows/record-billing-payment-failure.workflow';

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
);

export async function recordBillingPaymentFailureAction(
  input: RecordBillingPaymentFailureActionInput,
) {
  return recordBillingPaymentFailureActionImpl(input);
}
