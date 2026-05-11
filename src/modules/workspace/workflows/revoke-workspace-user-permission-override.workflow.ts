import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { revokePermission } from '@/modules/permissions/permissions.services';

export async function revokeWorkspaceUserPermissionOverrideWorkflow(input: {
  workspaceId: string;
  userPermissionId: string;
  revokedById?: string;
}) {
  return withUnitOfWork(async () => {
    const override = await prisma.userPermission.findUnique({
      where: { id: input.userPermissionId },
      include: {
        permission: {
          select: {
            id: true,
            key: true,
          },
        },
        identity: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!override || override.workspaceId !== input.workspaceId) {
      throwError(ERR.NOT_FOUND, 'Workspace permission override not found.');
    }

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
