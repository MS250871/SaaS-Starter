import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  listGovernancePermissionAdminSnapshots,
  listRolePermissionsByRoleDefinition,
} from '@/modules/permissions/permissions.services';
import {
  getGovernanceRoleAdminSnapshot,
  listGovernanceRoleAdminSnapshots,
} from '@/modules/roles/role.services';

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export type PlatformGovernanceRoleRow = {
  id: string;
  scopeLabel: string;
  key: string;
  name: string;
  description: string | null;
  hierarchyRankLabel: string;
  isSystem: boolean;
  isDefault: boolean;
  isAssignable: boolean;
  isActive: boolean;
  permissionCount: number;
  assignmentCount: number;
  inviteCount: number;
  overrideCount: number;
  updatedAtLabel: string;
};

export type PlatformGovernancePermissionRow = {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  entity: string;
  isActive: boolean;
  roleGrantCount: number;
  workspaceOverrideCount: number;
  userOverrideCount: number;
  updatedAtLabel: string;
};

export async function getPlatformGovernanceRolesPageData() {
  return withActionTxContext(async () => {
    const [roles, permissions] = await Promise.all([
      listGovernanceRoleAdminSnapshots({ limit: 500 }),
      listGovernancePermissionAdminSnapshots({ limit: 500 }),
    ]);

    const roleRows: PlatformGovernanceRoleRow[] = roles.map((role) => ({
      id: role.id,
      scopeLabel: formatEnumLabel(role.scope),
      key: role.key,
      name: role.name,
      description: role.description ?? null,
      hierarchyRankLabel:
        typeof role.hierarchyRank === 'number' ? String(role.hierarchyRank) : 'N/A',
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      isAssignable: role.isAssignable,
      isActive: role.isActive,
      permissionCount: role._count.rolePermissions,
      assignmentCount:
        role._count.platformMemberships + role._count.workspaceMemberships,
      inviteCount: role._count.platformInvites + role._count.workspaceInvites,
      overrideCount: role._count.workspaceRolePermissions,
      updatedAtLabel: formatDate(role.updatedAt),
    }));

    const permissionRows: PlatformGovernancePermissionRow[] = permissions.map(
      (permission) => ({
        id: permission.id,
        key: permission.key,
        name: permission.name ?? null,
        description: permission.description ?? null,
        entity: permission.entity,
        isActive: permission.isActive,
        roleGrantCount: permission._count.rolePermissions,
        workspaceOverrideCount: permission._count.workspaceRolePermissions,
        userOverrideCount: permission._count.userPermissions,
        updatedAtLabel: formatDate(permission.updatedAt),
      }),
    );

    return {
      summary: {
        roles: roleRows.length,
        activeRoles: roleRows.filter((row) => row.isActive).length,
        platformRoles: roleRows.filter((row) => row.scopeLabel === 'Platform').length,
        workspaceRoles: roleRows.filter((row) => row.scopeLabel === 'Workspace').length,
        permissions: permissionRows.length,
        activePermissions: permissionRows.filter((row) => row.isActive).length,
      },
      roleRows,
      permissionRows,
    };
  });
}

export async function getPlatformGovernanceRoleEditorData(roleDefinitionId?: string) {
  return withActionTxContext(async () => {
    const [permissions, role, assignedPermissions] = await Promise.all([
      listGovernancePermissionAdminSnapshots({ limit: 500 }),
      roleDefinitionId
        ? getGovernanceRoleAdminSnapshot(roleDefinitionId)
        : Promise.resolve(null),
      roleDefinitionId
        ? listRolePermissionsByRoleDefinition(roleDefinitionId)
        : Promise.resolve([]),
    ]);

    return {
      role,
      permissions,
      assignedPermissionIds: assignedPermissions.map(
        (permission) => permission.permissionId,
      ),
    };
  });
}

export async function getPlatformGovernanceRoleDetailData(roleDefinitionId: string) {
  return withActionTxContext(async () => {
    const [role, permissions] = await Promise.all([
      getGovernanceRoleAdminSnapshot(roleDefinitionId),
      listRolePermissionsByRoleDefinition(roleDefinitionId),
    ]);

    return {
      role,
      permissions: permissions.map((permission) => ({
        id: permission.id,
        key: permission.permission.key,
        name: permission.permission.name ?? null,
        entity: permission.permission.entity,
        description: permission.permission.description ?? null,
      })),
    };
  });
}
