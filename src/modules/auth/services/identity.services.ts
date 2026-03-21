import { identityCrud, identityQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get identity by ID
 */
export async function getIdentityById(id: string) {
  return identityQueries.byId(id);
}

/**
 * Find identity by email
 */
export async function findIdentityByEmail(email: string) {
  return identityQueries.findFirst({
    where: {
      email: email.toLowerCase(),
    },
  });
}

/**
 * Find identity by phone
 */
export async function findIdentityByPhone(phone: string) {
  return identityQueries.findFirst({
    where: {
      phone,
    },
  });
}

/**
 * Find identity by identifier (email OR phone)
 */
export async function findIdentityByIdentifier(identifier: string) {
  const normalized = identifier.trim();

  return identityQueries.findFirst({
    where: {
      OR: [{ email: normalized.toLowerCase() }, { phone: normalized }],
    },
  });
}

/**
 * Create identity
 */
export async function createIdentity(data: CreateInput<'Identity'>) {
  const payload: CreateInput<'Identity'> = { ...data };

  if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }

  return identityCrud.create(payload);
}

/**
 * Update identity
 */
export async function updateIdentity(
  id: string,
  data: UpdateInput<'Identity'>,
) {
  const payload: UpdateInput<'Identity'> = { ...data };

  if (typeof payload.email === 'string') {
    payload.email = payload.email.toLowerCase();
  }

  return identityCrud.update(id, payload);
}

/**
 * Activate / deactivate identity
 */
export async function setIdentityActive(id: string, isActive: boolean) {
  return identityCrud.update(id, {
    isActive,
  });
}

/**
 * Soft delete identity
 */
export async function deleteIdentity(id: string) {
  return identityCrud.delete(id);
}

/**
 * List identities needs improvement in filtering and pagination options, but this is a basic implementation for now
 */
export async function listIdentities(opts?: {
  page?: number;
  pageSize?: number;
}) {
  return identityQueries.paginated({
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
