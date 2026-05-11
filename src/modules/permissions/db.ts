import { buildCud } from '@/lib/crud/cud-factory';
import { buildQueries } from '@/lib/crud/query-factory';

/* -------------------------------------------------------------------------- */
/*                           PERMISSION (GLOBAL)                              */
/* -------------------------------------------------------------------------- */

export const permissionCrud = buildCud({
  model: 'Permission',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const permissionQueries = buildQueries({
  model: 'Permission',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});

/* -------------------------------------------------------------------------- */
/*                          ROLE PERMISSION (GLOBAL)                          */
/* -------------------------------------------------------------------------- */

export const rolePermissionCrud = buildCud({
  model: 'RolePermission',
  workspaceScoped: false,
  softDelete: false,
});

export const rolePermissionQueries = buildQueries({
  model: 'RolePermission',
  workspaceScoped: false,
  defaultActiveFilter: false,
});

/* -------------------------------------------------------------------------- */
/*                 WORKSPACE ROLE PERMISSION (ROW-OWNED TABLE)                */
/* -------------------------------------------------------------------------- */

export const workspaceRolePermissionCrud = buildCud({
  model: 'WorkspaceRolePermission',
  workspaceScoped: false,
  softDelete: false,
});

export const workspaceRolePermissionQueries = buildQueries({
  model: 'WorkspaceRolePermission',
  workspaceScoped: false,
  defaultActiveFilter: false,
});

/* -------------------------------------------------------------------------- */
/*                           USER PERMISSION                                  */
/* -------------------------------------------------------------------------- */

export const userPermissionCrud = buildCud({
  model: 'UserPermission',
  workspaceScoped: false,
  activeField: 'isActive',
  softDelete: false,
});

export const userPermissionQueries = buildQueries({
  model: 'UserPermission',
  workspaceScoped: false,
  defaultActiveFilter: true,
  activeField: 'isActive',
});
