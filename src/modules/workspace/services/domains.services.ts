import {
  workspaceDomainCrud,
  workspaceDomainQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceDomain } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get domain by ID
 */
export async function getDomainById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  const domain = await workspaceDomainQueries.byId(id);
  if (!domain) throwError(ERR.NOT_FOUND, 'Domain not found');

  return domain;
}

/**
 * Find domain
 */
export async function findDomain(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return workspaceDomainQueries.findFirst({
    where: { domain: domain.toLowerCase() },
  });
}

/**
 * Resolve workspace by domain
 */
export async function resolveWorkspaceByDomain(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return workspaceDomainQueries.findFirst({
    where: {
      domain: domain.toLowerCase(),
      isVerified: true,
    },
    include: { workspace: true },
  });
}

/**
 * List domains
 */
export async function listWorkspaceDomains(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId is required');
  }

  return workspaceDomainQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create domain
 */
export async function createWorkspaceDomain(
  data: CreateInput<'WorkspaceDomain'>,
) {
  if (!data?.workspaceId || !data?.domain) {
    throwError(ERR.INVALID_INPUT, 'Invalid domain data');
  }

  const normalized = data.domain.toLowerCase();

  const exists = await workspaceDomainQueries.findFirst({
    where: { domain: normalized },
  });

  if (exists) {
    throwError(ERR.ALREADY_EXISTS, 'Domain already exists');
  }

  try {
    return await workspaceDomainCrud.create({
      ...data,
      domain: normalized,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create domain', undefined, e);
  }
}

/**
 * Verify domain
 */
export async function verifyWorkspaceDomain(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  try {
    return await workspaceDomainCrud.update(id, {
      isVerified: true,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to verify domain', undefined, e);
  }
}

/**
 * Set primary domain
 */
export async function setPrimaryWorkspaceDomain(
  id: string,
  workspaceId: string,
) {
  if (!id || !workspaceId) {
    throwError(ERR.INVALID_INPUT, 'id and workspaceId required');
  }

  const domains = (await listWorkspaceDomains(
    workspaceId,
  )) as WorkspaceDomain[];

  const updates = domains.map((d) =>
    workspaceDomainCrud.update(d.id, {
      isPrimary: d.id === id,
    }),
  );

  return Promise.all(updates);
}

/**
 * Update domain
 */
export async function updateWorkspaceDomain(
  id: string,
  data: UpdateInput<'WorkspaceDomain'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  const payload: UpdateInput<'WorkspaceDomain'> = { ...data };

  if (typeof payload.domain === 'string') {
    payload.domain = payload.domain.toLowerCase();
  }

  try {
    return await workspaceDomainCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update domain', undefined, e);
  }
}

/**
 * Delete domain
 */
export async function deleteWorkspaceDomain(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Domain ID is required');

  try {
    return await workspaceDomainCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete domain', undefined, e);
  }
}

/**
 * Check if exists
 */
export async function domainExists(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain is required');

  return workspaceDomainQueries.exists({
    domain: domain.toLowerCase(),
  });
}
