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
 * Find customer by email
 */
export async function findCustomerByEmail(workspaceId: string, email: string) {
  if (!workspaceId || !email) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and email are required');
  }

  return customerQueries.findFirst({
    where: {
      workspaceId,
      email: email.toLowerCase(),
    },
  });
}

/**
 * Find customer by phone
 */
export async function findCustomerByPhone(workspaceId: string, phone: string) {
  if (!workspaceId || !phone) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and phone are required');
  }

  return customerQueries.findFirst({
    where: {
      workspaceId,
      phone,
    },
  });
}

/**
 * Find customer by identifier
 */
export async function findCustomerByIdentifier(
  workspaceId: string,
  identifier: string,
) {
  if (!workspaceId || !identifier) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identifier are required');
  }

  const normalized = identifier.trim();

  if (normalized.includes('@')) {
    return findCustomerByEmail(workspaceId, normalized);
  }

  return findCustomerByPhone(workspaceId, normalized);
}

/**
 * Create customer
 */
export async function createCustomer(data: CreateInput<'Customer'>) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const payload: CreateInput<'Customer'> = { ...data };

  if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }

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

  if (typeof payload.email === 'string') {
    payload.email = payload.email.toLowerCase();
  }

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

/**
 * Check existence
 */
export async function customerExistsByIdentifier(
  workspaceId: string,
  identifier: string,
) {
  if (!workspaceId || !identifier) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and identifier are required');
  }

  const normalized = identifier.trim();

  if (normalized.includes('@')) {
    return customerQueries.exists({
      workspaceId,
      email: normalized.toLowerCase(),
    });
  }

  return customerQueries.exists({
    workspaceId,
    phone: normalized,
  });
}
