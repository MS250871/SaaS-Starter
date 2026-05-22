import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  getWorkspaceUserPermissionOverride,
  revokePermission,
} from '@/modules/permissions/services/permissions.services';

export async function revokeWorkspaceUserPermissionOverrideWorkflow(input: {
  workspaceId: string;
  userPermissionId: string;
  revokedById?: string;
}) {
  return withUnitOfWork(async () => {
    const override = await getWorkspaceUserPermissionOverride(
      input.workspaceId,
      input.userPermissionId,
    );

    await revokePermission(override.id, input.revokedById);

    return {
      userPermissionId: override.id,
      permissionId: override.permissionId,
      permissionKey: override.permission?.key ?? '',
      identityId: override.identityId,
      memberName:
        `${override.identity?.firstName ?? ''} ${override.identity?.lastName ?? ''}`.trim() ||
        override.identity?.email ||
        'Workspace member',
    };
  });
}
