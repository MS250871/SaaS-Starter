'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/permissions.services';
import {
  createWorkspaceCustomerActionSchema,
  createWorkspaceCustomerSchema,
  type CreateWorkspaceCustomerActionInput,
  type CreateWorkspaceCustomerDomain,
} from '@/modules/workspace/schema';
import { createWorkspaceCustomerWorkflow } from '@/modules/customer/workflows/create-workspace-customer.workflow';

const createWorkspaceCustomerActionImpl = createTxAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreateWorkspaceCustomerActionInput =
      createWorkspaceCustomerActionSchema.parse(raw);
    const customer: CreateWorkspaceCustomerDomain =
      createWorkspaceCustomerSchema.parse(parsed);

    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertPermission(session.permissions, 'customer.create');

    const result = await createWorkspaceCustomerWorkflow({
      workspaceId: session.workspaceId,
      ...customer,
    });

    return {
      successMessage: 'Customer created successfully.',
      ...result,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
    };
  },
);

export async function createWorkspaceCustomerAction(formData: FormData) {
  return createWorkspaceCustomerActionImpl(formData);
}
