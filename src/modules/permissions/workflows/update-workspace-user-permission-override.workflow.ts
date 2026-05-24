import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { invalidatePermissionsCache } from '@/modules/permissions/services/permission-cache.services';
import {
  getPermissionById,
  upsertWorkspaceUserPermissionOverride,
} from '@/modules/permissions/services/permissions.services';
import { findActiveWorkspaceMembershipByIdentity } from '@/modules/workspace/services/membership.services';

export async function updateWorkspaceUserPermissionOverrideWorkflow(input: {
  workspaceId: string;
  identityId: string;
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  grantedById?: string;
}) {
  const result = await withUnitOfWork(async () => {
    const [membership, permission] = await Promise.all([
      findActiveWorkspaceMembershipByIdentity(
        input.workspaceId,
        input.identityId,
      ),
      getPermissionById(input.permissionId),
    ]);

    if (!membership) {
      throwError(
        ERR.NOT_FOUND,
        'The selected identity is not an active member of this workspace.',
      );
    }

    const override = await upsertWorkspaceUserPermissionOverride({
      workspaceId: input.workspaceId,
      identityId: input.identityId,
      permissionId: input.permissionId,
      effect: input.effect,
      grantedById: input.grantedById,
    });

    return {
      userPermissionId: override.id,
      identityId: input.identityId,
      permissionId: input.permissionId,
      permissionKey: permission.key,
      effect: override.effect,
      memberName:
        `${membership.identity.firstName ?? ''} ${membership.identity.lastName ?? ''}`.trim() ||
        membership.identity.email ||
        'Workspace member',
    };
  });

  await invalidatePermissionsCache();

  return result;
}
