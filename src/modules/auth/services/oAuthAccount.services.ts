import { oauthAccountCrud, oauthAccountQueries } from '@/modules/auth/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get OAuth account by ID
 */
export async function getOAuthAccountById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OAuth account ID is required');
  }

  const account = await oauthAccountQueries.byId(id);

  if (!account) {
    throwError(ERR.NOT_FOUND, 'OAuth account not found');
  }

  return account;
}

/**
 * Find OAuth account
 */
export async function findOAuthAccount(
  provider: string,
  providerAccountId: string,
) {
  if (!provider || !providerAccountId) {
    throwError(
      ERR.INVALID_INPUT,
      'Provider and providerAccountId are required',
    );
  }

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
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

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
 * Create OAuth account
 */
export async function createOAuthAccount(data: CreateInput<'OAuthAccount'>) {
  if (!data?.provider || !data?.providerAccountId) {
    throwError(
      ERR.INVALID_INPUT,
      'Provider and providerAccountId are required',
    );
  }

  try {
    return await oauthAccountCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create OAuth account', undefined, e);
  }
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
  if (!params.identityId || !params.provider || !params.providerAccountId) {
    throwError(ERR.INVALID_INPUT, 'Missing required OAuth identity params');
  }

  try {
    return await oauthAccountCrud.create({
      identityId: params.identityId,
      provider: params.provider,
      providerAccountId: params.providerAccountId,
      accessToken: params.accessToken ?? undefined,
      refreshToken: params.refreshToken ?? undefined,
      scope: params.scope ?? undefined,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create OAuth account for identity',
      undefined,
      e,
    );
  }
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
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OAuth account ID is required');
  }

  const payload: UpdateInput<'OAuthAccount'> = {
    accessToken: data.accessToken ?? undefined,
    refreshToken: data.refreshToken ?? undefined,
    scope: data.scope ?? undefined,
  };

  try {
    return await oauthAccountCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update OAuth tokens', undefined, e);
  }
}

/**
 * Link OAuth account to identity
 */
export async function linkOAuthAccountToIdentity(
  id: string,
  identityId: string,
) {
  if (!id || !identityId) {
    throwError(ERR.INVALID_INPUT, 'id and identityId are required');
  }

  try {
    return await oauthAccountCrud.update(id, {
      identityId,
    });
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to link OAuth account to identity',
      undefined,
      e,
    );
  }
}

/**
 * Delete OAuth account
 */
export async function deleteOAuthAccount(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'OAuth account ID is required');
  }

  try {
    return await oauthAccountCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete OAuth account', undefined, e);
  }
}
