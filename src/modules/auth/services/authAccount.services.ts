import { authAccountCrud, authAccountQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { AuthAccountType } from '@/generated/prisma/client';
import { emailSchema } from '../schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get auth account by ID
 */
export async function getAuthAccountById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Auth account ID is required');
  }

  const account = await authAccountQueries.byId(id);

  if (!account) {
    throwError(ERR.NOT_FOUND, 'Auth account not found');
  }

  return account;
}

/**
 * Find by type + value
 */
export async function findAuthAccountByTypeValue(
  type: AuthAccountType,
  value: string,
) {
  if (!type || !value) {
    throwError(ERR.INVALID_INPUT, 'Type and value are required');
  }

  return authAccountQueries.findFirst({
    where: {
      type,
      value,
    },
  });
}

/**
 * Find auth account by identifier
 */
export async function findAuthAccountByIdentifier(identifier: string) {
  if (!identifier) {
    throwError(ERR.INVALID_INPUT, 'Identifier is required');
  }

  const normalized = identifier.trim();

  const isEmail = emailSchema.safeParse(normalized).success;

  if (isEmail) {
    return findAuthAccountByTypeValue(
      AuthAccountType.EMAIL,
      normalized.toLowerCase(),
    );
  }

  return findAuthAccountByTypeValue(AuthAccountType.PHONE, normalized);
}

/**
 * List auth accounts for identity
 */
export async function listAuthAccountsForIdentity(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return authAccountQueries.many({
    where: {
      identityId,
    },
  });
}

/**
 * Create auth account
 */
export async function createAuthAccount(data: CreateInput<'AuthAccount'>) {
  if (!data?.type || !data?.value) {
    throwError(ERR.INVALID_INPUT, 'Type and value are required');
  }

  const payload: CreateInput<'AuthAccount'> = { ...data };

  if (payload.type === AuthAccountType.EMAIL && payload.value) {
    payload.value = payload.value.toLowerCase();
  }

  try {
    return await authAccountCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create auth account', undefined, e);
  }
}

/**
 * Create auth account for identity
 */
export async function createAuthAccountForIdentity(
  identityId: string,
  type: AuthAccountType,
  value: string,
) {
  if (!identityId || !type || !value) {
    throwError(ERR.INVALID_INPUT, 'identityId, type and value are required');
  }

  const normalized =
    type === AuthAccountType.EMAIL ? value.toLowerCase() : value;

  try {
    return await authAccountCrud.create({
      identityId,
      type,
      value: normalized,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create auth account for identity',
      undefined,
      e,
    );
  }
}

/**
 * Verify auth account
 */
export async function verifyAuthAccount(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Auth account ID is required');
  }

  try {
    return await authAccountCrud.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to verify auth account', undefined, e);
  }
}

/**
 * Update auth account
 */
export async function updateAuthAccount(
  id: string,
  data: UpdateInput<'AuthAccount'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Auth account ID is required');
  }

  const payload: UpdateInput<'AuthAccount'> = { ...data };

  if (payload.value && typeof payload.value === 'string') {
    const account = await getAuthAccountById(id);

    if (account.type === AuthAccountType.EMAIL) {
      payload.value = payload.value.toLowerCase();
    }
  }

  try {
    return await authAccountCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update auth account', undefined, e);
  }
}

/**
 * Delete auth account
 */
export async function deleteAuthAccount(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Auth account ID is required');
  }

  try {
    return await authAccountCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete auth account', undefined, e);
  }
}

/**
 * Set password hash
 */
export async function setAuthAccountPassword(id: string, passwordHash: string) {
  if (!id || !passwordHash) {
    throwError(ERR.INVALID_INPUT, 'ID and password hash are required');
  }

  try {
    return await authAccountCrud.update(id, {
      passwordHash,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to set password', undefined, e);
  }
}
