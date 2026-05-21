'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/audit.services';
import { governancePermissionActionSchema } from '@/modules/permissions/permission.schema';
import {
  createPermission,
  deletePermission,
  getGovernancePermissionAdminSnapshot,
  setPermissionActive,
  updatePermission,
} from '@/modules/permissions/permissions.services';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

function parseCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

async function logPermissionAdminAction(params: {
  session: Awaited<ReturnType<typeof requirePlatformAdminSession>>;
  action: string;
  entityId: string;
  description: string;
}) {
  const requestContext = getRequestContext();

  await logAdminAction({
    adminIdentityId: params.session.identityId,
    adminEmail: null,
    adminRole: params.session.platformRoleSystemKeys?.[0] ?? null,
    action: params.action,
    entityType: 'Permission',
    entityId: params.entityId,
    description: params.description,
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId,
  });
}

const createPermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();

  const parsed = governancePermissionActionSchema.parse({
    key: formData.get('key'),
    entity: formData.get('entity'),
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const permission = await createPermission({
    key: parsed.key,
    entity: parsed.entity,
    name: parsed.name || null,
    description: parsed.description || null,
    isActive: parsed.isActive,
  });

  await logPermissionAdminAction({
    session,
    action: 'permission.create',
    entityId: permission.id,
    description: `Permission ${permission.key} created.`,
  });

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} created successfully.`,
  };
});

const updatePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();
  const permissionId = String(formData.get('permissionId') ?? '').trim();

  if (!permissionId) {
    throwError(ERR.INVALID_INPUT, 'Permission ID is required');
  }

  const parsed = governancePermissionActionSchema.parse({
    key: formData.get('key'),
    entity: formData.get('entity'),
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const permission = await updatePermission(permissionId, {
    key: parsed.key,
    entity: parsed.entity,
    name: parsed.name || null,
    description: parsed.description || null,
    isActive: parsed.isActive,
  });

  await logPermissionAdminAction({
    session,
    action: 'permission.update',
    entityId: permission.id,
    description: `Permission ${permission.key} updated.`,
  });

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} updated successfully.`,
  };
});

const togglePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();
  const permissionId = String(formData.get('permissionId') ?? '').trim();

  if (!permissionId) {
    throwError(ERR.INVALID_INPUT, 'Permission ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const permission = await setPermissionActive(permissionId, isActive);

  await logPermissionAdminAction({
    session,
    action: isActive ? 'permission.activate' : 'permission.deactivate',
    entityId: permission.id,
    description: `Permission ${permission.key} ${isActive ? 'activated' : 'deactivated'}.`,
  });

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
});

const deletePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();
  const permissionId = String(formData.get('permissionId') ?? '').trim();

  if (!permissionId) {
    throwError(ERR.INVALID_INPUT, 'Permission ID is required');
  }

  const permission = await getGovernancePermissionAdminSnapshot(permissionId);

  if (
    permission._count.rolePermissions > 0 ||
    permission._count.workspaceRolePermissions > 0 ||
    permission._count.userPermissions > 0
  ) {
    throwError(
      ERR.INVALID_INPUT,
      'This permission is in use and cannot be deleted until role grants and overrides are removed.',
    );
  }

  await deletePermission(permissionId);

  await logPermissionAdminAction({
    session,
    action: 'permission.delete',
    entityId: permissionId,
    description: `Permission ${permission.key} deleted.`,
  });

  return {
    successMessage: 'Permission deleted successfully.',
  };
});

export async function createPermissionAdminAction(formData: FormData) {
  return createPermissionAdminActionImpl(formData);
}

export async function updatePermissionAdminAction(formData: FormData) {
  return updatePermissionAdminActionImpl(formData);
}

export async function togglePermissionAdminAction(formData: FormData) {
  return togglePermissionAdminActionImpl(formData);
}

export async function deletePermissionAdminAction(formData: FormData) {
  return deletePermissionAdminActionImpl(formData);
}
