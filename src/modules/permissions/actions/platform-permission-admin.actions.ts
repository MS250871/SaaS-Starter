'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { governancePermissionActionSchema } from '@/modules/permissions/permission.schema';
import { invalidatePermissionsCache } from '@/modules/permissions/services/permission-cache.services';
import {
  createPermission,
  deletePermission,
  getGovernancePermissionAdminSnapshot,
  setPermissionActive,
  updatePermission,
} from '@/modules/permissions/services/permissions.services';
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

function buildPermissionAuditInput(params: {
  action: string;
  entityId: string;
  description: string;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'GOVERNANCE' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: 'Permission',
    entityId: params.entityId,
    description: params.description,
  };
}

const createPermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

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

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} created successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ result, args }) => {
      const formData = args[0];
      const key = String(formData.get('key') ?? '').trim();

      return buildPermissionAuditInput({
        action: 'permission.create',
        entityId: result.permissionId,
        description: `Permission ${key} created.`,
      });
    },
  },
});

const updatePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();
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

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} updated successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ result, args }) => {
      const formData = args[0];
      const key = String(formData.get('key') ?? '').trim();

      return buildPermissionAuditInput({
        action: 'permission.update',
        entityId: result.permissionId,
        description: `Permission ${key} updated.`,
      });
    },
  },
});

const togglePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();
  const permissionId = String(formData.get('permissionId') ?? '').trim();

  if (!permissionId) {
    throwError(ERR.INVALID_INPUT, 'Permission ID is required');
  }

  const isActive = parseCheckboxValue(formData, 'isActive');
  const permission = await setPermissionActive(permissionId, isActive);

  return {
    permissionId: permission.id,
    successMessage: `${permission.key} ${
      isActive ? 'activated' : 'deactivated'
    } successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ result, args }) => {
      const formData = args[0];
      const isActive = parseCheckboxValue(formData, 'isActive');

      return buildPermissionAuditInput({
        action: isActive ? 'permission.activate' : 'permission.deactivate',
        entityId: result.permissionId,
        description: `Permission ${
          isActive ? 'activated' : 'deactivated'
        }.`,
      });
    },
  },
});

const deletePermissionAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();
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

  return {
    successMessage: 'Permission deleted successfully.',
  };
}, {
  audit: {
    onSuccess: ({ args }) => {
      const formData = args[0];
      const permissionId = String(formData.get('permissionId') ?? '').trim();

      return buildPermissionAuditInput({
        action: 'permission.delete',
        entityId: permissionId,
        description: 'Permission deleted.',
      });
    },
  },
});

export async function createPermissionAdminAction(formData: FormData) {
  const response = await createPermissionAdminActionImpl(formData);

  if (response.success) {
    await invalidatePermissionsCache();
  }

  return response;
}

export async function updatePermissionAdminAction(formData: FormData) {
  const response = await updatePermissionAdminActionImpl(formData);

  if (response.success) {
    await invalidatePermissionsCache();
  }

  return response;
}

export async function togglePermissionAdminAction(formData: FormData) {
  const response = await togglePermissionAdminActionImpl(formData);

  if (response.success) {
    await invalidatePermissionsCache();
  }

  return response;
}

export async function deletePermissionAdminAction(formData: FormData) {
  const response = await deletePermissionAdminActionImpl(formData);

  if (response.success) {
    await invalidatePermissionsCache();
  }

  return response;
}
