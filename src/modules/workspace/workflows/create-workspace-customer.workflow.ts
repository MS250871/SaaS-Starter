import { provisionWorkspaceCustomer } from '@/modules/workspace/services/workspace-customer-provisioning.services';

export async function createWorkspaceCustomerWorkflow(params: {
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  externalId?: string | null;
}) {
  return provisionWorkspaceCustomer({
    workspaceId: params.workspaceId,
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone,
    externalId: params.externalId ?? null,
    allowExistingCustomer: false,
  });
}
