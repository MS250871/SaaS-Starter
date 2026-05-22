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
  revokeWorkspaceUserPermissionOverrideActionSchema,
  type RevokeWorkspaceUserPermissionOverrideActionInput,
} from '@/modules/workspace/schema';
import { revokeWorkspaceUserPermissionOverrideWorkflow } from '@/modules/permissions/workflows/revoke-workspace-user-permission-override.workflow';

function assertCanManageWorkspaceAccess(permissions: string[]) {
  if (
    !hasPermission(permissions, 'permission.grant') &&
    !hasPermission(permissions, 'permission.revoke') &&
    !hasPermission(permissions, 'permission.update')
  ) {
    assertPermission(permissions, 'permission.revoke');
  }
}

const revokeWorkspaceUserPermissionOverrideActionImpl = createAction(
  async (formData: FormData) => {
    const raw = Object.fromEntries(formData.entries());
    const parsed: RevokeWorkspaceUserPermissionOverrideActionInput =
      revokeWorkspaceUserPermissionOverrideActionSchema.parse(raw);
    const session = await getUserSession();

    if (!session?.workspaceId || !session.identityId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    assertCanManageWorkspaceAccess(session.permissions);

    const result = await revokeWorkspaceUserPermissionOverrideWorkflow({
      workspaceId: session.workspaceId,
      userPermissionId: parsed.userPermissionId,
      revokedById: session.identityId,
    });

    return {
      successMessage: `Removed the direct permission override for ${result.memberName}.`,
      ...result,
    };
  },
);

export async function revokeWorkspaceUserPermissionOverrideAction(
  formData: FormData,
) {
  return revokeWorkspaceUserPermissionOverrideActionImpl(formData);
}
