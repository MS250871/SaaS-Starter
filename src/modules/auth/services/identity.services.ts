import { identityCrud, identityQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get identity by ID
 */
export async function getIdentityById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const identity = await identityQueries.byId(id);

  if (!identity) {
    throwError(ERR.NOT_FOUND, 'Identity not found');
  }

  return identity;
}

/**
 * Find identity by email
 */
export async function findIdentityByEmail(email: string) {
  if (!email) {
    throwError(ERR.INVALID_INPUT, 'Email is required');
  }

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
  if (!phone) {
    throwError(ERR.INVALID_INPUT, 'Phone is required');
  }

  return identityQueries.findFirst({
    where: {
      phone,
    },
  });
}

/**
 * Find identity by identifier
 */
export async function findIdentityByIdentifier(identifier: string) {
  if (!identifier) {
    throwError(ERR.INVALID_INPUT, 'Identifier is required');
  }

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
  if (!data) {
    throwError(ERR.INVALID_INPUT, 'Identity data is required');
  }

  const payload: CreateInput<'Identity'> = { ...data };

  if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }

  try {
    return await identityCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create identity', undefined, e);
  }
}

/**
 * Update identity
 */
export async function updateIdentity(
  id: string,
  data: UpdateInput<'Identity'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const payload: UpdateInput<'Identity'> = { ...data };

  if (typeof payload.email === 'string') {
    payload.email = payload.email.toLowerCase();
  }

  try {
    return await identityCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update identity', undefined, e);
  }
}

/**
 * Activate / deactivate identity
 */
export async function setIdentityActive(id: string, isActive: boolean) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  try {
    return await identityCrud.update(id, {
      isActive,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update identity status', undefined, e);
  }
}

/**
 * Delete identity
 */
export async function deleteIdentity(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  try {
    return await identityCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete identity', undefined, e);
  }
}

/**
 * List identities
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
