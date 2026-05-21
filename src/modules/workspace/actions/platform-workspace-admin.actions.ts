'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
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
      successMessage: `${workspace.name} ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
);

export async function togglePlatformWorkspaceActiveAction(formData: FormData) {
  return togglePlatformWorkspaceActiveActionImpl(formData);
}
