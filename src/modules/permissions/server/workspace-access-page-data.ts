import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  listPermissions,
  listWorkspaceRolePermissionOverrides,
  listWorkspaceUserPermissionOverridesDetailed,
} from '@/modules/permissions/permissions.services';
import { listRoleDefinitionsWithPermissions } from '@/modules/roles/role.services';
import { listActiveWorkspaceMembersWithRoles } from '@/modules/workspace/services/membership.services';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type AccessPermissionGroup = {
  entity: string;
  permissions: Array<{
    id: string;
    key: string;
    name: string | null;
    description: string | null;
  }>;
};

export async function getWorkspaceAccessPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        roles: [],
        permissionsByEntity: [],
        userOverrides: [],
        members: [],
        accessSummary: {
          roleCount: 0,
          permissionCount: 0,
          roleOverrideCount: 0,
          userOverrideCount: 0,
        },
      };
    }

    const [roleDefinitions, permissions, roleOverrides, userOverrides, members] =
      await Promise.all([
        listRoleDefinitionsWithPermissions('WORKSPACE'),
        listPermissions(),
        listWorkspaceRolePermissionOverrides(context.workspaceId),
        listWorkspaceUserPermissionOverridesDetailed(context.workspaceId),
        listActiveWorkspaceMembersWithRoles(context.workspaceId),
      ]);

    const overridesByRoleId = new Map<string, Record<string, 'allow' | 'deny'>>();

    for (const override of roleOverrides) {
      const roleOverridesForRole =
        overridesByRoleId.get(override.roleDefinitionId) ?? {};
      roleOverridesForRole[override.permissionId] = override.isAllowed
        ? 'allow'
        : 'deny';
      overridesByRoleId.set(override.roleDefinitionId, roleOverridesForRole);
    }

    const permissionsByEntityMap: Record<string, AccessPermissionGroup> = {};
    const permissionsByEntity: AccessPermissionGroup[] = Object.values(
      permissions.reduce(
        (
          acc: Record<string, AccessPermissionGroup>,
          permission: (typeof permissions)[number],
        ) => {
          acc[permission.entity] ??= {
            entity: permission.entity,
            permissions: [],
          };

          acc[permission.entity].permissions.push({
            id: permission.id,
            key: permission.key,
            name: permission.name ?? null,
            description: permission.description ?? null,
          });

          return acc;
        },
        permissionsByEntityMap,
      ),
    );

    return {
      ...context,
      roles: roleDefinitions.map((role: (typeof roleDefinitions)[number]) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        roleSystemKey: role.systemKey ?? null,
        roleRank: role.hierarchyRank ?? null,
        isAssignable: role.isAssignable,
        isDefault: role.isDefault,
        isSystem: role.isSystem,
        basePermissionIds: role.rolePermissions.map(
          (rolePermission: (typeof role.rolePermissions)[number]) =>
            rolePermission.permissionId,
        ),
        overrideModes: overridesByRoleId.get(role.id) ?? {},
      })),
      permissionsByEntity,
      userOverrides: userOverrides.map((override: (typeof userOverrides)[number]) => ({
        id: override.id,
        identityId: override.identityId,
        permissionId: override.permissionId,
        permissionKey: override.permission?.key ?? '',
        permissionName: override.permission?.name ?? null,
        effect: override.effect,
        source: override.source,
        createdAt: override.createdAt.toISOString(),
        expiresAt: override.expiresAt?.toISOString() ?? null,
        memberName:
          `${override.identity?.firstName ?? ''} ${
            override.identity?.lastName ?? ''
          }`.trim() ||
          override.identity?.email ||
          'Workspace member',
        memberEmail: override.identity?.email ?? null,
        grantedByName:
          `${override.grantedBy?.firstName ?? ''} ${
            override.grantedBy?.lastName ?? ''
          }`.trim() ||
          override.grantedBy?.email ||
          null,
      })),
      members: members.map((member: (typeof members)[number]) => ({
        membershipId: member.id,
        identityId: member.identityId,
        name:
          `${member.identity.firstName ?? ''} ${
            member.identity.lastName ?? ''
          }`.trim() ||
          member.identity.email ||
          'Workspace member',
        email: member.identity.email ?? null,
        roleName: member.roleDefinition.name,
        roleKey: member.roleDefinition.key,
      })),
      accessSummary: {
        roleCount: roleDefinitions.length,
        permissionCount: permissions.length,
        roleOverrideCount: roleOverrides.length,
        userOverrideCount: userOverrides.length,
      },
    };
  });
}
