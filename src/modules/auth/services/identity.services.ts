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

  const identity = await identityQueries.findUnique({
    where: { id },
  });

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

export async function listIdentityDisplayProfilesByIds(identityIds: string[]) {
  const uniqueIds = Array.from(new Set(identityIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  return identityQueries.many({
    where: {
      id: {
        in: uniqueIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });
}

export async function listIdentitiesByEmailsOrPhones(params: {
  emails?: string[];
  phones?: string[];
}) {
  const emails = Array.from(
    new Set((params.emails ?? []).filter(Boolean).map((value) => value.toLowerCase())),
  );
  const phones = Array.from(new Set((params.phones ?? []).filter(Boolean)));
  const orFilters = [];

  if (emails.length > 0) {
    orFilters.push({
      email: {
        in: emails,
      },
    });
  }

  if (phones.length > 0) {
    orFilters.push({
      phone: {
        in: phones,
      },
    });
  }

  if (orFilters.length === 0) {
    return [];
  }

  return identityQueries.many({
    where: {
      OR: orFilters,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });
}

export async function getIdentityNotificationRecipient(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const identity = await identityQueries.findFirst({
    where: { id: identityId },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });

  if (!identity) {
    throwError(ERR.NOT_FOUND, 'Identity not found');
  }

  return identity;
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
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const [totalItems, items] = await Promise.all([
    identityQueries.count(),
    identityQueries.many({
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

export async function getIdentityDisplayProfile(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  const identity = await identityQueries.findFirst({
    where: { id: identityId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  if (!identity) {
    throwError(ERR.NOT_FOUND, 'Identity not found');
  }

  return identity;
}
