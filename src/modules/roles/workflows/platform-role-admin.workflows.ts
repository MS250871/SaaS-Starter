import {
  clearRolePermissionsByRoleDefinition,
  createRolePermission,
} from '@/modules/permissions/permissions.services';
import {
  createRoleDefinition,
  deleteRoleDefinition,
  getGovernanceRoleAdminSnapshot,
  updateRoleDefinition,
} from '@/modules/roles/role.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type { RoleScope } from '@/modules/roles/role.types';

async function syncRolePermissions(params: {
  roleDefinitionId: string;
  permissionIds: string[];
}) {
  await clearRolePermissionsByRoleDefinition(params.roleDefinitionId);

  const uniquePermissionIds = Array.from(
    new Set(params.permissionIds.map((permissionId) => permissionId.trim()).filter(Boolean)),
  );

  for (const permissionId of uniquePermissionIds) {
    await createRolePermission({
      roleDefinitionId: params.roleDefinitionId,
      permissionId,
    });
  }
}

export async function createPlatformRoleWorkflow(input: {
  scope: RoleScope;
  key: string;
  name: string;
  description?: string | null;
  hierarchyRank?: number | null;
  isDefault?: boolean;
  isAssignable?: boolean;
  isActive?: boolean;
  permissionIds: string[];
}) {
  const role = await createRoleDefinition({
    scope: input.scope,
    key: input.key,
    name: input.name,
    description: input.description ?? null,
    hierarchyRank: input.hierarchyRank ?? null,
    isDefault: input.isDefault ?? false,
    isAssignable: input.isAssignable ?? true,
    isActive: input.isActive ?? true,
  });

  await syncRolePermissions({
    roleDefinitionId: role.id,
    permissionIds: input.permissionIds,
  });

  return role;
}

export async function updatePlatformRoleWorkflow(input: {
  roleDefinitionId: string;
  scope: RoleScope;
  key: string;
  name: string;
  description?: string | null;
  hierarchyRank?: number | null;
  isDefault?: boolean;
  isAssignable?: boolean;
  isActive?: boolean;
  permissionIds: string[];
}) {
  const role = await updateRoleDefinition(input.roleDefinitionId, {
    scope: input.scope,
    key: input.key,
    name: input.name,
    description: input.description ?? null,
    hierarchyRank: input.hierarchyRank ?? null,
    isDefault: input.isDefault ?? false,
    isAssignable: input.isAssignable ?? true,
    isActive: input.isActive ?? true,
  });

  await syncRolePermissions({
    roleDefinitionId: input.roleDefinitionId,
    permissionIds: input.permissionIds,
  });

  return role;
}

export async function deletePlatformRoleWorkflow(roleDefinitionId: string) {
  const role = await getGovernanceRoleAdminSnapshot(roleDefinitionId);

  if (role.isSystem) {
    throwError(ERR.INVALID_INPUT, 'System roles cannot be deleted.');
  }

  if (
    role._count.platformMemberships > 0 ||
    role._count.platformInvites > 0 ||
    role._count.workspaceMemberships > 0 ||
    role._count.workspaceInvites > 0 ||
    role._count.workspaceRolePermissions > 0
  ) {
    throwError(
      ERR.INVALID_INPUT,
      'This role is in use and cannot be deleted until memberships, invites, and overrides are removed.',
    );
  }

  await clearRolePermissionsByRoleDefinition(roleDefinitionId);
  await deleteRoleDefinition(roleDefinitionId);
}
