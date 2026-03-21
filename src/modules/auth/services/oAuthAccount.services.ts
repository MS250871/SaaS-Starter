import { oauthAccountCrud, oauthAccountQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get OAuth account by ID
 */
export async function getOAuthAccountById(id: string) {
  return oauthAccountQueries.byId(id);
}

/**
 * Find OAuth account by provider + providerAccountId
 */
export async function findOAuthAccount(
  provider: string,
  providerAccountId: string,
) {
  return oauthAccountQueries.findFirst({
    where: {
      provider,
      providerAccountId,
    },
  });
}

/**
 * List OAuth accounts for identity
 */
export async function listIdentityOAuthAccounts(identityId: string) {
  return oauthAccountQueries.many({
    where: {
      identityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List OAuth accounts for customer
 */
export async function listCustomerOAuthAccounts(customerId: string) {
  return oauthAccountQueries.many({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create OAuth account
 */
export async function createOAuthAccount(data: CreateInput<'OAuthAccount'>) {
  return oauthAccountCrud.create(data);
}

/**
 * Create OAuth account for identity
 */
export async function createOAuthAccountForIdentity(params: {
  identityId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  scope?: string | null;
}) {
  return oauthAccountCrud.create({
    identityId: params.identityId,
    provider: params.provider,
    providerAccountId: params.providerAccountId,
    accessToken: params.accessToken ?? undefined,
    refreshToken: params.refreshToken ?? undefined,
    scope: params.scope ?? undefined,
  });
}

/**
 * Create OAuth account for customer
 */
export async function createOAuthAccountForCustomer(params: {
  customerId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  scope?: string | null;
}) {
  return oauthAccountCrud.create({
    customerId: params.customerId,
    provider: params.provider,
    providerAccountId: params.providerAccountId,
    accessToken: params.accessToken ?? undefined,
    refreshToken: params.refreshToken ?? undefined,
    scope: params.scope ?? undefined,
  });
}

/**
 * Update OAuth tokens
 */
export async function updateOAuthTokens(
  id: string,
  data: {
    accessToken?: string | null;
    refreshToken?: string | null;
    scope?: string | null;
  },
) {
  const payload: UpdateInput<'OAuthAccount'> = {
    accessToken: data.accessToken ?? undefined,
    refreshToken: data.refreshToken ?? undefined,
    scope: data.scope ?? undefined,
  };

  return oauthAccountCrud.update(id, payload);
}

/**
 * Link OAuth account to identity
 */
export async function linkOAuthAccountToIdentity(
  id: string,
  identityId: string,
) {
  return oauthAccountCrud.update(id, {
    identityId,
    customerId: null,
  });
}

/**
 * Link OAuth account to customer
 */
export async function linkOAuthAccountToCustomer(
  id: string,
  customerId: string,
) {
  return oauthAccountCrud.update(id, {
    customerId,
    identityId: null,
  });
}

/**
 * Delete OAuth account
 */
export async function deleteOAuthAccount(id: string) {
  return oauthAccountCrud.delete(id);
}
