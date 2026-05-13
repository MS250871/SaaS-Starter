import crypto from 'crypto';
import { apiKeyCrud, apiKeyQueries } from '@/modules/workspace/db';
import type { Prisma } from '@/generated/prisma/client';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type WorkspaceDetailedApiKey = Prisma.ApiKeyGetPayload<{
  select: {
    id: true;
    name: true;
    keyPrefix: true;
    description: true;
    scopes: true;
    isActive: true;
    expiresAt: true;
    lastUsedAt: true;
    revokedAt: true;
    createdAt: true;
    createdBy: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
}>;

/**
 * Generate secure API key
 */
export function generateApiKey() {
  const prefix = 'smx_ws_';
  const random = crypto.randomBytes(24).toString('hex');
  return `${prefix}${random}`;
}

export function deriveApiKeyPrefix(secret: string) {
  return secret.slice(0, 16);
}

export function hashApiKey(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  const key = await apiKeyQueries.findUnique({
    where: { id },
  });
  if (!key) throwError(ERR.NOT_FOUND, 'API key not found');

  return key;
}

/**
 * Find API key
 */
export async function findApiKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, 'API key is required');

  return apiKeyQueries.findFirst({
    where: {
      OR: [{ keyHash: hashApiKey(key) }, { key }],
      isActive: true,
    },
  });
}

/**
 * Create API key
 */
export async function createApiKey(data: CreateInput<'ApiKey'>) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const secret =
    typeof data.key === 'string' && data.key.length > 0
      ? data.key
      : generateApiKey();
  const payload: CreateInput<'ApiKey'> = {
    ...data,
    key: null,
    keyPrefix: deriveApiKeyPrefix(secret),
    keyHash: hashApiKey(secret),
  };

  try {
    return await apiKeyCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create API key', undefined, e);
  }
}

/**
 * Create workspace API key
 */
export async function createWorkspaceApiKey(params: {
  workspaceId: string;
  name: string;
  createdById?: string | null;
  description?: string | null;
  scopes?: string[];
  expiresAt?: Date | null;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  try {
    const plainTextKey = generateApiKey();
    const apiKey = await apiKeyCrud.create({
      workspaceId: params.workspaceId,
      name: params.name,
      createdById: params.createdById ?? undefined,
      description: params.description ?? undefined,
      scopes: params.scopes ?? [],
      key: null,
      keyPrefix: deriveApiKeyPrefix(plainTextKey),
      keyHash: hashApiKey(plainTextKey),
      expiresAt: params.expiresAt ?? undefined,
    });

    return {
      apiKey,
      plainTextKey,
    };
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to create workspace API key',
      undefined,
      e,
    );
  }
}

/**
 * Update API key
 */
export async function updateApiKey(id: string, data: UpdateInput<'ApiKey'>) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  try {
    return await apiKeyCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update API key', undefined, e);
  }
}

/**
 * Revoke API key
 */
export async function revokeApiKey(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  try {
    return await apiKeyCrud.update(id, {
      isActive: false,
      revokedAt: new Date(),
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to revoke API key', undefined, e);
  }
}

/**
 * Rotate API key
 */
export async function rotateApiKey(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  const plainTextKey = generateApiKey();

  try {
    const apiKey = await apiKeyCrud.update(id, {
      key: null,
      keyPrefix: deriveApiKeyPrefix(plainTextKey),
      keyHash: hashApiKey(plainTextKey),
      isActive: true,
      revokedAt: null,
    });

    return {
      apiKey,
      plainTextKey,
    };
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to rotate API key', undefined, e);
  }
}

/**
 * Delete API key
 */
export async function deleteApiKey(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  try {
    return await apiKeyCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete API key', undefined, e);
  }
}

/**
 * List workspace API keys
 */
export async function listWorkspaceApiKeys(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return apiKeyQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Validate API key
 */
export async function validateApiKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, 'API key is required');

  const apiKey = await apiKeyQueries.findFirst({
    where: {
      OR: [{ keyHash: hashApiKey(key) }, { key }],
      isActive: true,
    },
  });

  if (!apiKey) return null;

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return null;
  }

  return apiKey;
}

export async function recordApiKeyUsage(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  try {
    return await apiKeyQueries.delegate.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update API key usage', undefined, e);
  }
}

export async function getWorkspaceApiKeyById(
  workspaceId: string,
  apiKeyId: string,
) {
  if (!workspaceId || !apiKeyId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and apiKeyId are required');
  }

  const apiKey = await apiKeyQueries.findFirst({
    where: {
      id: apiKeyId,
      workspaceId,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
    },
  });

  if (!apiKey) {
    throwError(ERR.NOT_FOUND, 'API key not found for this workspace');
  }

  return apiKey;
}

export async function countActiveWorkspaceApiKeys(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return apiKeyQueries.count({
    where: {
      workspaceId,
      isActive: true,
    },
  });
}

export async function listWorkspaceApiKeysDetailed(
  workspaceId: string,
): Promise<WorkspaceDetailedApiKey[]> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const apiKeys = await apiKeyQueries.many({
    where: {
      workspaceId,
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      description: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return apiKeys as unknown as WorkspaceDetailedApiKey[];
}
