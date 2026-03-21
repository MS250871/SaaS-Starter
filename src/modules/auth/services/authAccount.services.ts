import { authAccountCrud, authAccountQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { AuthAccountType } from '@/generated/prisma/client';

/**
 * Get auth account by ID
 */
export async function getAuthAccountById(id: string) {
  return authAccountQueries.byId(id);
}

/**
 * Find by type + value
 */
export async function findAuthAccountByTypeValue(
  type: AuthAccountType,
  value: string,
) {
  return authAccountQueries.findFirst({
    where: {
      type,
      value,
    },
  });
}

/**
 * Find auth account by identifier (auto detect email / phone)
 */
export async function findAuthAccountByIdentifier(identifier: string) {
  const normalized = identifier.trim();

  if (normalized.includes('@')) {
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
  return authAccountQueries.many({
    where: {
      identityId,
    },
  });
}

/**
 * List auth accounts for customer
 */
export async function listAuthAccountsForCustomer(customerId: string) {
  return authAccountQueries.many({
    where: {
      customerId,
    },
  });
}

/**
 * Create auth account
 */
export async function createAuthAccount(data: CreateInput<'AuthAccount'>) {
  const payload: CreateInput<'AuthAccount'> = { ...data };

  if (payload.type === AuthAccountType.EMAIL && payload.value) {
    payload.value = payload.value.toLowerCase();
  }

  return authAccountCrud.create(payload);
}

/**
 * Create auth account for identity
 */
export async function createAuthAccountForIdentity(
  identityId: string,
  type: AuthAccountType,
  value: string,
) {
  const normalized =
    type === AuthAccountType.EMAIL ? value.toLowerCase() : value;

  return authAccountCrud.create({
    identityId,
    type,
    value: normalized,
  });
}

/**
 * Create auth account for customer
 */
export async function createAuthAccountForCustomer(
  customerId: string,
  type: AuthAccountType,
  value: string,
) {
  const normalized =
    type === AuthAccountType.EMAIL ? value.toLowerCase() : value;

  return authAccountCrud.create({
    customerId,
    type,
    value: normalized,
  });
}

/**
 * Verify auth account
 */
export async function verifyAuthAccount(id: string) {
  return authAccountCrud.update(id, {
    isVerified: true,
    verifiedAt: new Date(),
  });
}

/**
 * Update auth account
 */
export async function updateAuthAccount(
  id: string,
  data: UpdateInput<'AuthAccount'>,
) {
  const payload: UpdateInput<'AuthAccount'> = { ...data };

  if (payload.value && typeof payload.value === 'string') {
    const account = await getAuthAccountById(id);

    if (account?.type === AuthAccountType.EMAIL) {
      payload.value = payload.value.toLowerCase();
    }
  }

  return authAccountCrud.update(id, payload);
}

/**
 * Delete auth account
 */
export async function deleteAuthAccount(id: string) {
  return authAccountCrud.delete(id);
}

/**
 * Set password hash (for optional password login)
 */
export async function setAuthAccountPassword(id: string, passwordHash: string) {
  return authAccountCrud.update(id, {
    passwordHash,
  });
}
