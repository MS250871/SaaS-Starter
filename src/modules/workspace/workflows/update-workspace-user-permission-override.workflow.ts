import { PermissionSource } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { getPermissionById } from '@/modules/permissions/permissions.services';

export async function updateWorkspaceUserPermissionOverrideWorkflow(input: {
  workspaceId: string;
  identityId: string;
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  grantedById?: string;
}) {
  return withUnitOfWork(async () => {
    const [membership, permission] = await Promise.all([
      prisma.membership.findFirst({
        where: {
          workspaceId: input.workspaceId,
          identityId: input.identityId,
          isActive: true,
        },
        select: {
          identityId: true,
          identity: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      getPermissionById(input.permissionId),
    ]);

    if (!membership) {
      throwError(
        ERR.NOT_FOUND,
        'The selected identity is not an active member of this workspace.',
      );
    }

    const existing = await prisma.userPermission.findFirst({
      where: {
        workspaceId: input.workspaceId,
        identityId: input.identityId,
        permissionId: input.permissionId,
        isActive: true,
        source: PermissionSource.MANUAL,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    const override = existing
      ? await prisma.userPermission.update({
          where: { id: existing.id },
          data: {
            effect: input.effect,
            grantedById: input.grantedById ?? null,
            revokedById: null,
            revokedAt: null,
            isActive: true,
            isTemporary: false,
            expiresAt: null,
          },
          include: {
            permission: true,
          },
        })
      : await prisma.userPermission.create({
          data: {
            workspaceId: input.workspaceId,
            identityId: input.identityId,
            permissionId: input.permissionId,
            grantedById: input.grantedById,
            source: PermissionSource.MANUAL,
            isActive: true,
            effect: input.effect,
          },
          include: {
            permission: true,
          },
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
}
