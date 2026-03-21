import { customerCrud, customerQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string) {
  return customerQueries.byId(id);
}

/**
 * Find customer by email within workspace
 */
export async function findCustomerByEmail(workspaceId: string, email: string) {
  return customerQueries.findFirst({
    where: {
      workspaceId,
      email: email.toLowerCase(),
    },
  });
}

/**
 * Find customer by phone within workspace
 */
export async function findCustomerByPhone(workspaceId: string, phone: string) {
  return customerQueries.findFirst({
    where: {
      workspaceId,
      phone,
    },
  });
}

/**
 * Find customer by identifier (email or phone)
 */
export async function findCustomerByIdentifier(
  workspaceId: string,
  identifier: string,
) {
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
  const payload: CreateInput<'Customer'> = { ...data };

  if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }

  return customerCrud.create(payload);
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: string,
  data: UpdateInput<'Customer'>,
) {
  const payload: UpdateInput<'Customer'> = { ...data };

  if (typeof payload.email === 'string') {
    payload.email = payload.email.toLowerCase();
  }

  return customerCrud.update(id, payload);
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string) {
  return customerCrud.delete(id);
}

/**
 * List customers for workspace
 */
export async function listWorkspaceCustomers(
  workspaceId: string,
  opts?: {
    page?: number;
    pageSize?: number;
  },
) {
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
 * Count customers in workspace
 */
export async function countWorkspaceCustomers(workspaceId: string) {
  return customerQueries.count({
    workspaceId,
  });
}

/**
 * Check if customer exists by identifier
 */
export async function customerExistsByIdentifier(
  workspaceId: string,
  identifier: string,
) {
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
