'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/services/permissions.services';
import {
  workspaceUserPermissionOverrideActionSchema,
  type WorkspaceUserPermissionOverrideActionInput,
} from '@/modules/workspace/schema';
import { updateWorkspaceUserPermissionOverrideWorkflow } from '@/modules/permissions/workflows/update-workspace-user-permission-override.workflow';

function assertCanManageWorkspaceAccess(permissions: string[]) {
  if (
    !hasPermission(permissions, 'permission.grant') &&
    !hasPermission(permissions, 'permission.revoke') &&
    !hasPermission(permissions, 'permission.update')
  ) {
    assertPermission(permissions, 'permission.grant');
  }
}

const updateWorkspaceUserPermissionOverrideActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: WorkspaceUserPermissionOverrideActionInput =
      workspaceUserPermissionOverrideActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanManageWorkspaceAccess(session.permissions);

    const result = await updateWorkspaceUserPermissionOverrideWorkflow({
      workspaceId: session.workspaceId,
      identityId: parsed.identityId,
      permissionId: parsed.permissionId,
      effect: parsed.effect,
      grantedById: session.identityId,
    });

    return {
      successMessage: `Direct ${result.effect.toLowerCase()} override saved for ${result.memberName}.`,
      ...result,
    };
  },
);

export async function updateWorkspaceUserPermissionOverrideAction(
  formData: FormData,
) {
  return updateWorkspaceUserPermissionOverrideActionImpl(formData);
}
