import { customerCrud, customerQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  const customer = await customerQueries.byId(id);

  if (!customer) {
    throwError(ERR.NOT_FOUND, 'Customer not found');
  }

  return customer;
}

/**
 * Get customer by identity id
 */
export async function getCustomerByIdentityId(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }
  const customer = await customerQueries.findUnique({ where: { identityId } });

  if (!customer) {
    throwError(ERR.NOT_FOUND, 'Customer not found');
  }

  return customer;
}

/**
 * Create customer
 */
export async function createCustomer(data: CreateInput<'Customer'>) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }
  const payload: CreateInput<'Customer'> = { ...data };
  try {
    return await customerCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create customer', undefined, e);
  }
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: string,
  data: UpdateInput<'Customer'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }
  const payload: UpdateInput<'Customer'> = { ...data };
  try {
    return await customerCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update customer', undefined, e);
  }
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Customer ID is required');
  }

  try {
    return await customerCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete customer', undefined, e);
  }
}

/**
 * List customers
 */
export async function listWorkspaceCustomers(
  workspaceId: string,
  opts?: {
    page?: number;
    pageSize?: number;
  },
) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return customerQueries.paginated({
    where: {
      workspaceId,
    },
    page: opts?.page ?? 1,
    pageSize: opts?.pageSize ?? 20,
    sort: [
      {
        column: 'createdAt',
        dir: 'desc',
      },
    ],
  });
}

/**
 * Count customers
 */
export async function countWorkspaceCustomers(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return customerQueries.count({
    workspaceId,
  });
}
