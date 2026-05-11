import { prisma } from '@/lib/prisma';

type ResolveParams = {
  identityId?: string;
  workspaceId?: string;
  workspaceRoleDefinitionId?: string;
  platformRoleDefinitionIds?: string[];
};

export async function resolvePermissions({
  identityId,
  workspaceId,
  workspaceRoleDefinitionId,
  platformRoleDefinitionIds,
}: ResolveParams): Promise<string[]> {
  const roleDefinitionIds = [
    workspaceRoleDefinitionId,
    ...(platformRoleDefinitionIds ?? []),
  ].filter((value): value is string => Boolean(value));

  const rolePermissions =
    roleDefinitionIds.length > 0
      ? await prisma.rolePermission.findMany({
          where: {
            roleDefinitionId: {
              in: roleDefinitionIds,
            },
          },
          include: {
            permission: {
              select: { key: true },
            },
          },
        })
      : [];

  const permissions = new Set<string>(
    rolePermissions.map((rolePermission) => rolePermission.permission.key),
  );

  if (workspaceId && workspaceRoleDefinitionId) {
    const workspaceOverrides = await prisma.workspaceRolePermission.findMany({
      where: {
        workspaceId,
        roleDefinitionId: workspaceRoleDefinitionId,
      },
      include: {
        permission: {
          select: { key: true },
        },
      },
    });

    for (const override of workspaceOverrides) {
      const key = override.permission.key;

      if (override.isAllowed) {
        permissions.add(key);
      } else {
        permissions.delete(key);
      }
    }
  }

  if (identityId) {
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        identityId,
        workspaceId: workspaceId ?? null,
        isActive: true,
      },
      include: {
        permission: {
          select: { key: true },
        },
      },
    });

    const now = new Date();

    for (const userPermission of userPermissions) {
      const key = userPermission.permission.key;

      if (userPermission.expiresAt && userPermission.expiresAt < now) continue;

      if (userPermission.revokedAt) {
        permissions.delete(key);
      } else {
        permissions.add(key);
      }
    }
  }

  return Array.from(permissions);
}
