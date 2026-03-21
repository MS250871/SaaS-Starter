import {
  workspaceDomainCrud,
  workspaceDomainQueries,
} from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { WorkspaceDomain } from '@/generated/prisma/client';

/**
 * Get domain by ID
 */
export async function getDomainById(id: string) {
  return workspaceDomainQueries.byId(id);
}

/**
 * Find domain record
 */
export async function findDomain(domain: string) {
  return workspaceDomainQueries.findFirst({
    where: {
      domain: domain.toLowerCase(),
    },
  });
}

/**
 * Resolve workspace by domain
 */
export async function resolveWorkspaceByDomain(domain: string) {
  return workspaceDomainQueries.findFirst({
    where: {
      domain: domain.toLowerCase(),
      isVerified: true,
    },
    include: {
      workspace: true,
    },
  });
}

/**
 * List domains for workspace
 */
export async function listWorkspaceDomains(workspaceId: string) {
  return workspaceDomainQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create domain
 */
export async function createWorkspaceDomain(
  data: CreateInput<'WorkspaceDomain'>,
) {
  const payload: CreateInput<'WorkspaceDomain'> = {
    ...data,
    domain: data.domain.toLowerCase(),
  };

  return workspaceDomainCrud.create(payload);
}

/**
 * Verify domain
 */
export async function verifyWorkspaceDomain(id: string) {
  return workspaceDomainCrud.update(id, {
    isVerified: true,
  });
}

/**
 * Set primary domain
 */
export async function setPrimaryWorkspaceDomain(
  id: string,
  workspaceId: string,
) {
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
  const payload: UpdateInput<'WorkspaceDomain'> = { ...data };

  if (typeof payload.domain === 'string') {
    payload.domain = payload.domain.toLowerCase();
  }

  return workspaceDomainCrud.update(id, payload);
}

/**
 * Delete domain
 */
export async function deleteWorkspaceDomain(id: string) {
  return workspaceDomainCrud.delete(id);
}

/**
 * Check if domain exists
 */
export async function domainExists(domain: string) {
  return workspaceDomainQueries.exists({
    domain: domain.toLowerCase(),
  });
}
