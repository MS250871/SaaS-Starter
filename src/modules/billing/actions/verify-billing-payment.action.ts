'use server';

import { headers } from 'next/headers';
import { getAuthCookie, getUserSession, setAuthCookies } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import { verifyBillingPaymentActionSchema, type VerifyBillingPaymentActionInput } from '@/modules/billing/schema';
import { verifyBillingPaymentWorkflow } from '@/modules/billing/workflows/verify-billing-payment.workflow';
import {
  buildHostTransferPath,
  issueHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';

const verifyBillingPaymentActionImpl = createAction(
  async (input: VerifyBillingPaymentActionInput) => {
    const parsed = verifyBillingPaymentActionSchema.parse(input);
    const session = await getUserSession();

    if (!session?.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Login session missing');
    }

    const result = await verifyBillingPaymentWorkflow(
      {
        identityId: session.identityId,
        workspaceId: session.workspaceId,
      },
      parsed,
    );

    if (result.requiresWorkspaceCreation) {
      const auth = await getAuthCookie();

      if (!auth) {
        throwError(ERR.INVALID_STATE, 'Auth flow missing for paid signup.');
      }

      await setAuthCookies({
        data: {
          ...auth,
          pendingPriceId: result.priceId,
          pendingPaymentId: result.paymentId,
          pendingSubscriptionId: result.subscriptionId,
          createdAt: Date.now(),
        },
      });
    }

    if (result.workspaceId && result.canonicalHost) {
      const currentHost = normalizeHostname((await headers()).get('host') ?? '');

      if (currentHost !== result.canonicalHost) {
        const token = await issueHostTransferToken({
          session,
          workspaceId: result.workspaceId,
          targetHost: result.canonicalHost,
          intent: result.intent ?? 'paid',
          returnPath: result.redirectTo,
        });

        return {
          ...result,
          redirectTo: buildHostTransferPath(token),
        };
      }
    }

    return result;
  },
);

export async function verifyBillingPaymentAction(
  input: VerifyBillingPaymentActionInput,
) {
  return verifyBillingPaymentActionImpl(input);
}
