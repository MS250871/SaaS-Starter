'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  hasPermission,
  assertPermission,
} from '@/modules/permissions/permissions.services';
import {
  createBillingCheckoutActionSchema,
  type CreateBillingCheckoutActionInput,
} from '@/modules/billing/schema';
import { createBillingCheckoutWorkflow } from '@/modules/billing/workflows/create-billing-checkout.workflow';

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
);

export async function createBillingCheckoutAction(
  input: CreateBillingCheckoutActionInput,
) {
  return createBillingCheckoutActionImpl(input);
}
