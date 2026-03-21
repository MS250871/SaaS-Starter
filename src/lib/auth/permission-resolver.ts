import { prisma } from '@/lib/prisma';
import { WorkspaceRole, PlatformRole } from '@/generated/prisma/client';

type ResolveParams = {
  identityId?: string;
  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
  platformRole?: PlatformRole;
};

export async function resolvePermissions({
  identityId,
  workspaceId,
  workspaceRole,
  platformRole,
}: ResolveParams): Promise<string[]> {
  /* ---------------------------------------------------------------------- */
  /*                          1. BASE ROLE PERMISSIONS                       */
  /* ---------------------------------------------------------------------- */

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      OR: [
        workspaceRole ? { workspaceRole } : undefined,
        platformRole ? { platformRole } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      permission: {
        select: { key: true },
      },
    },
  });

  let permissions = new Set<string>(
    rolePermissions.map((rp) => rp.permission.key),
  );

  /* ---------------------------------------------------------------------- */
  /*                    2. WORKSPACE ROLE OVERRIDES                          */
  /* ---------------------------------------------------------------------- */

  if (workspaceId && workspaceRole) {
    const workspaceOverrides = await prisma.workspaceRolePermission.findMany({
      where: {
        workspaceId,
        workspaceRole,
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

  /* ---------------------------------------------------------------------- */
  /*                          3. USER PERMISSIONS                            */
  /* ---------------------------------------------------------------------- */

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

    for (const up of userPermissions) {
      const key = up.permission.key;

      // skip expired
      if (up.expiresAt && up.expiresAt < now) continue;

      // revoked
      if (up.revokedAt) {
        permissions.delete(key);
      } else {
        permissions.add(key);
      }
    }
  }

  return Array.from(permissions);
}
