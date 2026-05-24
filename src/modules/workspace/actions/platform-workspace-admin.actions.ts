'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  clearWorkspaceDomainCache,
  clearWorkspaceSlugCache,
} from '@/modules/workspace/services/routing-cache.services';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';
import {
  activateWorkspace,
  deactivateWorkspace,
} from '@/modules/workspace/services/workspace.services';
import { assertPlatformAnyPermission } from '@/modules/platform/platform-admin-access';

async function requirePlatformWorkspaceUpdateSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAnyPermission({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
    permissions: session.permissions ?? [],
    required: ['platformWorkspace.update', 'platformWorkspace.deactivate'],
  });

  return session;
}

function buildWorkspaceAuditInput(params: {
  action: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'WORKSPACE' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: 'Workspace',
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  };
}

const togglePlatformWorkspaceActiveActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformWorkspaceUpdateSession();

    const workspaceId = String(formData.get('workspaceId') ?? '').trim();
    const isActive =
      String(formData.get('isActive') ?? '').trim().toLowerCase() === 'true';

    if (!workspaceId) {
      throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
    }

    const workspace = isActive
      ? await activateWorkspace(workspaceId)
      : await deactivateWorkspace(workspaceId);

    return {
      workspaceId: workspace.id,
      slug: workspace.slug,
      defaultDomain: workspace.defaultDomain,
      successMessage: `${workspace.name} ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const isActive =
          String(formData.get('isActive') ?? '').trim().toLowerCase() ===
          'true';

        return buildWorkspaceAuditInput({
          action: isActive
            ? 'platform.workspace.activate'
            : 'platform.workspace.deactivate',
          entityId: result.workspaceId,
          description: `Workspace ${isActive ? 'activated' : 'deactivated'}.`,
          metadata: { isActive },
        });
      },
    },
  },
);

export async function togglePlatformWorkspaceActiveAction(formData: FormData) {
  const response = await togglePlatformWorkspaceActiveActionImpl(formData);

  if (response.success) {
    await Promise.all([
      invalidateWorkspaceSurfaceCaches(response.data.workspaceId),
      clearWorkspaceSlugCache(response.data.slug),
      response.data.defaultDomain
        ? clearWorkspaceDomainCache(response.data.defaultDomain)
        : Promise.resolve(),
    ]);
  }

  return response;
}
