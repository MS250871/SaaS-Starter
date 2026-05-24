'use server';

import { headers } from 'next/headers';
import type { Prisma } from '@/generated/prisma/client';
import { getAuthCookie, getUserSession, setAuthCookies } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { normalizeHostname } from '@/lib/middleware/proxy-utils';
import { resolvePublicHostname } from '@/lib/http/public-url';
import { verifyBillingPaymentActionSchema, type VerifyBillingPaymentActionInput } from '@/modules/billing/schema';
import { verifyBillingPaymentWorkflow } from '@/modules/billing/workflows/verify-billing-payment.workflow';
import {
  buildHostTransferPath,
  issueHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';

function buildBillingVerificationAuditInput(params: {
  workspaceId?: string;
  action: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: params.workspaceId ? ('WORKSPACE' as const) : ('SYSTEM' as const),
    category: 'BILLING' as const,
    source: params.workspaceId
      ? ('WORKSPACE_APP' as const)
      : ('AUTH' as const),
    action: params.action,
    entityType: 'Payment',
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
    workspaceId: params.workspaceId ?? null,
  };
}

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
      const hdrs = await headers();
      const currentHost = resolvePublicHostname({
        host: hdrs.get('host'),
        forwardedHost: hdrs.get('x-forwarded-host'),
      });

      if (currentHost !== normalizeHostname(result.canonicalHost)) {
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
  {
    audit: {
      onSuccess: ({ result }) =>
        buildBillingVerificationAuditInput({
          workspaceId: result.workspaceId,
          action:
            result.mode === 'subscription'
              ? 'billing.payment.subscription.verify'
              : 'billing.payment.oneTime.verify',
          entityId: result.paymentId,
          description:
            result.mode === 'subscription'
              ? 'Subscription payment verified successfully.'
              : 'One-time payment verified successfully.',
          metadata: {
            priceId: result.priceId,
            requiresWorkspaceCreation: result.requiresWorkspaceCreation,
            subscriptionId: result.subscriptionId ?? null,
          },
        }),
    },
  },
);

export async function verifyBillingPaymentAction(
  input: VerifyBillingPaymentActionInput,
) {
  return verifyBillingPaymentActionImpl(input);
}
