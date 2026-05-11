import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { getPermissionById } from '@/modules/permissions/permissions.services';
import { getRoleDefinitionById } from '@/modules/roles/role.services';

export async function updateWorkspaceRolePermissionOverrideWorkflow(input: {
  workspaceId: string;
  roleDefinitionId: string;
  permissionId: string;
  mode: 'inherit' | 'allow' | 'deny';
}) {
  return withUnitOfWork(async () => {
    const [roleDefinition, permission] = await Promise.all([
      getRoleDefinitionById(input.roleDefinitionId),
      getPermissionById(input.permissionId),
    ]);

    if (roleDefinition.scope !== 'WORKSPACE') {
      throwError(
        ERR.INVALID_INPUT,
        'Workspace role permission overrides can only target workspace roles.',
      );
    }

    const existing = await prisma.workspaceRolePermission.findFirst({
      where: {
        workspaceId: input.workspaceId,
        roleDefinitionId: input.roleDefinitionId,
        permissionId: input.permissionId,
      },
      select: {
        id: true,
        isAllowed: true,
      },
    });

    if (input.mode === 'inherit') {
      if (existing) {
        await prisma.workspaceRolePermission.delete({
          where: { id: existing.id },
        });
      }

      return {
        workspaceId: input.workspaceId,
        roleDefinitionId: input.roleDefinitionId,
        permissionId: input.permissionId,
        permissionKey: permission.key,
        roleName: roleDefinition.name,
        mode: 'inherit' as const,
      };
    }

    if (existing) {
      await prisma.workspaceRolePermission.update({
        where: { id: existing.id },
        data: {
          isAllowed: input.mode === 'allow',
        },
      });
    } else {
      await prisma.workspaceRolePermission.create({
        data: {
          workspaceId: input.workspaceId,
          roleDefinitionId: input.roleDefinitionId,
          permissionId: input.permissionId,
          isAllowed: input.mode === 'allow',
        },
      });
    }

    return {
      workspaceId: input.workspaceId,
      roleDefinitionId: input.roleDefinitionId,
      permissionId: input.permissionId,
      permissionKey: permission.key,
      roleName: roleDefinition.name,
      mode: input.mode,
    };
  });
}
