import crypto from 'crypto';
import { apiKeyCrud, apiKeyQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

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
  return apiKeyQueries.byId(id);
}

/**
 * Find API key by key value
 */
export async function findApiKey(key: string) {
  return apiKeyQueries.findFirst({
    where: {
      key,
      isActive: true,
    },
  });
}

/**
 * Create API key
 */
export async function createApiKey(data: CreateInput<'ApiKey'>) {
  const payload: CreateInput<'ApiKey'> = {
    ...data,
    key: data.key ?? generateApiKey(),
  };

  return apiKeyCrud.create(payload);
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
  return apiKeyCrud.create({
    workspaceId: params.workspaceId,
    createdById: params.createdById ?? undefined,
    description: params.description ?? undefined,
    scopes: params.scopes ?? [],
    key: generateApiKey(),
    expiresAt: params.expiresAt ?? undefined,
  });
}

/**
 * Update API key
 */
export async function updateApiKey(id: string, data: UpdateInput<'ApiKey'>) {
  return apiKeyCrud.update(id, data);
}

/**
 * Revoke API key
 */
export async function revokeApiKey(id: string) {
  return apiKeyCrud.update(id, {
    isActive: false,
  });
}

/**
 * Rotate API key
 */
export async function rotateApiKey(id: string) {
  const newKey = generateApiKey();

  await apiKeyCrud.update(id, {
    key: newKey,
  });

  return newKey;
}

/**
 * Delete API key
 */
export async function deleteApiKey(id: string) {
  return apiKeyCrud.delete(id);
}

/**
 * List workspace API keys
 */
export async function listWorkspaceApiKeys(workspaceId: string) {
  return apiKeyQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Validate API key
 */
export async function validateApiKey(key: string) {
  const apiKey = await apiKeyQueries.findFirst({
    where: {
      key,
      isActive: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return null;
  }

  return apiKey;
}
