import crypto from 'crypto';
import { apiKeyCrud, apiKeyQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Generate secure API key
 */
export function generateApiKey() {
  const prefix = 'sk_';
  const random = crypto.randomBytes(32).toString('hex');
  return `${prefix}${random}`;
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'API key ID is required');

  const key = await apiKeyQueries.byId(id);
  if (!key) throwError(ERR.NOT_FOUND, 'API key not found');

  return key;
}

/**
 * Find API key
 */
export async function findApiKey(key: string) {
  if (!key) throwError(ERR.INVALID_INPUT, 'API key is required');

  return apiKeyQueries.findFirst({
    where: { key, isActive: true },
  });
}

/**
 * Create API key
 */
export async function createApiKey(data: CreateInput<'ApiKey'>) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  const payload: CreateInput<'ApiKey'> = {
    ...data,
    key: data.key ?? generateApiKey(),
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
  createdById?: string | null;
  description?: string | null;
  scopes?: string[];
  expiresAt?: Date | null;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  try {
    return await apiKeyCrud.create({
      workspaceId: params.workspaceId,
      createdById: params.createdById ?? undefined,
      description: params.description ?? undefined,
      scopes: params.scopes ?? [],
      key: generateApiKey(),
      expiresAt: params.expiresAt ?? undefined,
    });
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

  const newKey = generateApiKey();

  try {
    await apiKeyCrud.update(id, { key: newKey });
    return newKey;
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
    where: { key, isActive: true },
  });

  if (!apiKey) return null;

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return null;
  }

  return apiKey;
}
