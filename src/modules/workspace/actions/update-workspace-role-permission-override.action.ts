'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/permissions.services';
import {
  workspaceRolePermissionOverrideActionSchema,
  type WorkspaceRolePermissionOverrideActionInput,
} from '@/modules/workspace/schema';
import { updateWorkspaceRolePermissionOverrideWorkflow } from '@/modules/workspace/workflows/update-workspace-role-permission-override.workflow';

function assertCanManageWorkspaceAccess(permissions: string[]) {
  if (
    !hasPermission(permissions, 'permission.grant') &&
    !hasPermission(permissions, 'permission.revoke') &&
    !hasPermission(permissions, 'permission.update')
  ) {
    assertPermission(permissions, 'permission.grant');
  }
}

const updateWorkspaceRolePermissionOverrideActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: WorkspaceRolePermissionOverrideActionInput =
      workspaceRolePermissionOverrideActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanManageWorkspaceAccess(session.permissions);

    const result = await updateWorkspaceRolePermissionOverrideWorkflow({
      workspaceId: session.workspaceId,
      roleDefinitionId: parsed.roleDefinitionId,
      permissionId: parsed.permissionId,
      mode: parsed.mode,
    });

    return {
      successMessage: `Role override updated for ${result.roleName}.`,
      ...result,
    };
  },
);

export async function updateWorkspaceRolePermissionOverrideAction(
  formData: FormData,
) {
  return updateWorkspaceRolePermissionOverrideActionImpl(formData);
}
