'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  hasPermission,
  assertPermission,
} from '@/modules/permissions/services/permissions.services';
import {
  createBillingCheckoutActionSchema,
  type CreateBillingCheckoutActionInput,
} from '@/modules/billing/schema';
import { createBillingCheckoutWorkflow } from '@/modules/billing/workflows/create-billing-checkout.workflow';

function buildBillingCheckoutAuditInput(params: {
  workspaceFlow: boolean;
  action: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: params.workspaceFlow ? ('WORKSPACE' as const) : ('SYSTEM' as const),
    category: 'BILLING' as const,
    source: params.workspaceFlow
      ? ('WORKSPACE_APP' as const)
      : ('AUTH' as const),
    action: params.action,
    entityType: 'Payment',
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

function assertCanStartBillingCheckout(params: {
  permissions: string[];
  workspaceId?: string;
  mode: CreateBillingCheckoutActionInput['mode'];
}) {
  if (!params.workspaceId) {
    return;
  }

  if (params.mode === 'subscription') {
    if (
      !hasPermission(params.permissions, 'subscription.create') &&
      !hasPermission(params.permissions, 'payment.create')
    ) {
      assertPermission(params.permissions, 'subscription.create');
    }

    return;
  }

  assertPermission(params.permissions, 'payment.create');
}

const createBillingCheckoutActionImpl = createAction(
  async (input: CreateBillingCheckoutActionInput) => {
    const parsed = createBillingCheckoutActionSchema.parse(input);
    const session = await getUserSession();

    if (!session?.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Login session missing');
    }

    assertCanStartBillingCheckout({
      permissions: session.permissions,
      workspaceId: session.workspaceId,
      mode: parsed.mode,
    });

    return createBillingCheckoutWorkflow(
      {
        identityId: session.identityId,
        workspaceId: session.workspaceId,
      },
      parsed,
    );
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const input = args[0];
        const workspaceFlow =
          input.source === 'workspace-features' ||
          input.source === 'workspace-domains' ||
          input.source === 'workspace-billing';

        return buildBillingCheckoutAuditInput({
          workspaceFlow,
          action:
            result.mode === 'subscription'
              ? 'billing.checkout.subscription.create'
              : 'billing.checkout.oneTime.create',
          entityId: result.paymentId,
          description:
            result.mode === 'subscription'
              ? 'Subscription checkout started.'
              : 'One-time checkout started.',
          metadata: {
            kind: result.kind,
            mode: result.mode,
            priceId: result.priceId,
            source: input.source ?? null,
          },
        });
      },
    },
  },
);

export async function createBillingCheckoutAction(
  input: CreateBillingCheckoutActionInput,
) {
  return createBillingCheckoutActionImpl(input);
}
