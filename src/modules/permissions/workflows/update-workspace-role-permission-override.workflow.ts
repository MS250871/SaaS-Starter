import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  clearWorkspaceRolePermissionOverride,
  findWorkspaceRolePermissionOverride,
  getPermissionById,
  setWorkspaceRolePermissionOverride,
} from '@/modules/permissions/permissions.services';
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

    const existing = await findWorkspaceRolePermissionOverride({
      workspaceId: input.workspaceId,
      roleDefinitionId: input.roleDefinitionId,
      permissionId: input.permissionId,
    });

    if (input.mode === 'inherit') {
      if (existing) {
        await clearWorkspaceRolePermissionOverride({
          workspaceId: input.workspaceId,
          roleDefinitionId: input.roleDefinitionId,
          permissionId: input.permissionId,
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

    await setWorkspaceRolePermissionOverride({
      workspaceId: input.workspaceId,
      roleDefinitionId: input.roleDefinitionId,
      permissionId: input.permissionId,
      isAllowed: input.mode === 'allow',
    });

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
