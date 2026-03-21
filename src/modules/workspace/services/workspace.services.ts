import { workspaceCrud, workspaceQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get workspace by ID
 */
export async function getWorkspaceById(id: string) {
  return workspaceQueries.byId(id);
}

/**
 * Find workspace by slug
 */
export async function findWorkspaceBySlug(slug: string) {
  return workspaceQueries.findFirst({
    where: {
      slug,
    },
  });
}

/**
 * Find workspace by primary email
 */
export async function findWorkspaceByPrimaryEmail(email: string) {
  return workspaceQueries.findFirst({
    where: {
      primaryEmail: email.toLowerCase(),
    },
  });
}

/**
 * Create workspace
 */
export async function createWorkspace(data: CreateInput<'Workspace'>) {
  const payload: CreateInput<'Workspace'> = { ...data };

  if (payload.primaryEmail) {
    payload.primaryEmail = payload.primaryEmail.toLowerCase();
  }

  return workspaceCrud.create(payload);
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  id: string,
  data: UpdateInput<'Workspace'>,
) {
  const payload: UpdateInput<'Workspace'> = { ...data };

  if (typeof payload.primaryEmail === 'string') {
    payload.primaryEmail = payload.primaryEmail.toLowerCase();
  }

  return workspaceCrud.update(id, payload);
}

/**
 * Deactivate workspace
 */
export async function deactivateWorkspace(id: string) {
  return workspaceCrud.update(id, {
    isActive: false,
  });
}

/**
 * Activate workspace
 */
export async function activateWorkspace(id: string) {
  return workspaceCrud.update(id, {
    isActive: true,
  });
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(id: string) {
  return workspaceCrud.delete(id);
}

/**
 * List workspaces
 */
export async function listWorkspaces(opts?: {
  page?: number;
  pageSize?: number;
}) {
  return workspaceQueries.paginated({
    page: opts?.page ?? 1,
    pageSize: opts?.pageSize ?? 20,
    sort: [
      {
        column: 'createdAt',
        dir: 'desc',
      },
    ],
  });
}

/**
 * Check if workspace exists by slug
 */
export async function workspaceExistsBySlug(slug: string) {
  return workspaceQueries.exists({
    slug,
  });
}

/**
 * Check if workspace exists by domain
 */
export async function workspaceExistsByDomain(domain: string) {
  return workspaceQueries.exists({
    defaultDomain: domain,
  });
}
