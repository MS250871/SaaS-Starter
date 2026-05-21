import { workspaceCrud, workspaceQueries } from '@/modules/workspace/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type PlatformWorkspaceAdminSnapshot = Prisma.WorkspaceGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    defaultDomain: true;
    primaryEmail: true;
    isActive: true;
    createdAt: true;
    settings: {
      select: {
        settings: true;
      };
    };
    _count: {
      select: {
        domains: true;
        memberships: true;
        customers: true;
        invites: true;
        apiKeys: true;
      };
    };
  };
}>;

export type PlatformWorkspaceSelectOption = Prisma.WorkspaceGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    isActive: true;
  };
}>;

/**
 * Get workspace
 */
export async function getWorkspaceById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Workspace ID required');

  const ws = await workspaceQueries.findUnique({
    where: { id },
  });
  if (!ws) throwError(ERR.NOT_FOUND, 'Workspace not found');

  return ws;
}

export async function findWorkspaceBySlug(slug: string) {
  if (!slug) throwError(ERR.INVALID_INPUT, 'Slug required');

  return workspaceQueries.findFirst({ where: { slug } });
}

export async function findWorkspaceByPrimaryEmail(email: string) {
  if (!email) throwError(ERR.INVALID_INPUT, 'Email required');

  return workspaceQueries.findFirst({
    where: { primaryEmail: email.toLowerCase() },
  });
}

export async function createWorkspace(data: CreateInput<'Workspace'>) {
  if (!data?.slug) {
    throwError(ERR.INVALID_INPUT, 'Workspace slug required');
  }

  const exists =
    (await workspaceQueries.count({
      where: { slug: data.slug },
    })) > 0;
  if (exists) throwError(ERR.ALREADY_EXISTS, 'Workspace slug already exists');

  const payload = { ...data };

  if (payload.primaryEmail) {
    payload.primaryEmail = payload.primaryEmail.toLowerCase();
  }

  try {
    return await workspaceCrud.create(payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create workspace', undefined, e);
  }
}

export async function updateWorkspace(
  id: string,
  data: UpdateInput<'Workspace'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Workspace ID required');

  const payload = { ...data };

  if (typeof payload.primaryEmail === 'string') {
    payload.primaryEmail = payload.primaryEmail.toLowerCase();
  }

  try {
    return await workspaceCrud.update(id, payload);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update workspace', undefined, e);
  }
}

export async function deactivateWorkspace(id: string) {
  return updateWorkspace(id, { isActive: false });
}

export async function activateWorkspace(id: string) {
  return updateWorkspace(id, { isActive: true });
}

export async function deleteWorkspace(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Workspace ID required');

  try {
    return await workspaceCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete workspace', undefined, e);
  }
}

export async function listWorkspaces(opts?: {
  page?: number;
  pageSize?: number;
}) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const [totalItems, items] = await Promise.all([
    workspaceQueries.count(),
    workspaceQueries.many({
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

export async function listPlatformWorkspaceAdminSnapshots(opts?: {
  page?: number;
  pageSize?: number;
  query?: string | null;
}) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const query = opts?.query?.trim() ?? '';
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { slug: { contains: query, mode: 'insensitive' as const } },
          {
            primaryEmail: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
          {
            defaultDomain: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
        ],
      }
    : undefined;

  const [totalItems, items] = await Promise.all([
    workspaceQueries.delegate.count({ where }),
    workspaceQueries.delegate.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        defaultDomain: true,
        primaryEmail: true,
        isActive: true,
        createdAt: true,
        settings: {
          select: {
            settings: true,
          },
        },
        _count: {
          select: {
            domains: true,
            memberships: true,
            customers: true,
            invites: true,
            apiKeys: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items as PlatformWorkspaceAdminSnapshot[],
    page,
    pageSize,
    query,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

export async function getPlatformWorkspaceAdminSnapshot(
  workspaceId: string,
): Promise<PlatformWorkspaceAdminSnapshot> {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID required');

  const workspace = await workspaceQueries.delegate.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      defaultDomain: true,
      primaryEmail: true,
      isActive: true,
      createdAt: true,
      settings: {
        select: {
          settings: true,
        },
      },
      _count: {
        select: {
          domains: true,
          memberships: true,
          customers: true,
          invites: true,
          apiKeys: true,
        },
      },
    },
  });

  if (!workspace) {
    throwError(ERR.NOT_FOUND, 'Workspace not found');
  }

  return workspace as PlatformWorkspaceAdminSnapshot;
}

export async function listPlatformWorkspaceSelectOptions(): Promise<
  PlatformWorkspaceSelectOption[]
> {
  const workspaces = await workspaceQueries.delegate.findMany({
    orderBy: [{ name: 'asc' }, { slug: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  return workspaces as PlatformWorkspaceSelectOption[];
}

export async function workspaceExistsBySlug(slug: string) {
  if (!slug) throwError(ERR.INVALID_INPUT, 'Slug required');

  return (
    (await workspaceQueries.count({
      where: { slug },
    })) > 0
  );
}

export async function workspaceExistsByDomain(domain: string) {
  if (!domain) throwError(ERR.INVALID_INPUT, 'Domain required');

  return (
    (await workspaceQueries.count({
      where: { defaultDomain: domain },
    })) > 0
  );
}

export async function getWorkspaceAdminSurfaceWorkspace(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'Workspace ID required');

  const workspace = await workspaceQueries.findFirst({
    where: {
      id: workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      defaultDomain: true,
    },
  });

  if (!workspace) throwError(ERR.NOT_FOUND, 'Workspace not found');

  return workspace;
}
