import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                           PERMISSION (GLOBAL)                               */
/* -------------------------------------------------------------------------- */

export const permissionCrud = buildCud({
  model: 'Permission',
  workspaceScoped: false, // ❗ FIXED (global)
  activeField: 'isActive',
  softDelete: false,
});

export const permissionQueries = buildQueries({
  model: 'Permission',
  workspaceScoped: false, // ❗ FIXED
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/* -------------------------------------------------------------------------- */
/*                          ROLE PERMISSION (GLOBAL)                           */
/* -------------------------------------------------------------------------- */

export const rolePermissionCrud = buildCud({
  model: 'RolePermission',
  workspaceScoped: false, // ❗ global defaults
  softDelete: false,
});

export const rolePermissionQueries = buildQueries({
  model: 'RolePermission',
  workspaceScoped: false,
  defaultActiveFilter: false, // no isActive
});

/* -------------------------------------------------------------------------- */
/*                 WORKSPACE ROLE PERMISSION (TENANT OVERRIDE)                 */
/* -------------------------------------------------------------------------- */

export const workspaceRolePermissionCrud = buildCud({
  model: 'WorkspaceRolePermission',
  workspaceScoped: true, // ✅ scoped
  softDelete: false,
});

export const workspaceRolePermissionQueries = buildQueries({
  model: 'WorkspaceRolePermission',
  workspaceScoped: true,
  defaultActiveFilter: false,
});

/* -------------------------------------------------------------------------- */
/*                           USER PERMISSION                                   */
/* -------------------------------------------------------------------------- */

export const userPermissionCrud = buildCud({
  model: 'UserPermission',
  workspaceScoped: true,
  activeField: 'isActive',
  softDelete: false,
});

export const userPermissionQueries = buildQueries({
  model: 'UserPermission',
  workspaceScoped: true,
  defaultActiveFilter: true,
  activeField: 'isActive',
});
