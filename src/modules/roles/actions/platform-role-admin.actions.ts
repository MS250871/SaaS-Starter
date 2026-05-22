'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/services/audit.services';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';
import { governanceRoleActionSchema } from '@/modules/roles/role.schema';
import { setRoleDefinitionActive } from '@/modules/roles/services/role.services';
import {
  createPlatformRoleWorkflow,
  deletePlatformRoleWorkflow,
  updatePlatformRoleWorkflow,
} from '@/modules/roles/workflows/platform-role-admin.workflows';

function parseCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function parseNullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const numeric = Number(text);

  return Number.isFinite(numeric) ? numeric : null;
}

function parsePermissionIds(formData: FormData) {
  return formData.getAll('permissionIds').map(String);
}

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

async function logRoleAdminAction(params: {
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
    entityType: 'RoleDefinition',
    entityId: params.entityId,
    description: params.description,
    ipAddress: requestContext.ip,
    userAgent: requestContext.userAgent,
    requestId: requestContext.requestId,
  });
}

const createRoleAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();

  const parsed = governanceRoleActionSchema.parse({
    scope: formData.get('scope'),
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    hierarchyRank: parseNullableNumber(formData.get('hierarchyRank')),
    isDefault: parseCheckboxValue(formData, 'isDefault'),
    isAssignable: parseCheckboxValue(formData, 'isAssignable'),
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const role = await createPlatformRoleWorkflow({
    ...parsed,
    description: parsed.description || null,
    permissionIds: parsePermissionIds(formData),
  });

  await logRoleAdminAction({
    session,
    action: 'role.create',
    entityId: role.id,
    description: `Role definition ${role.key} created.`,
  });

  return {
    roleDefinitionId: role.id,
    successMessage: `${role.name} created successfully.`,
  };
});

const updateRoleAdminActionImpl = createTxAction(async (formData: FormData) => {
  const session = await requirePlatformAdminSession();
  const roleDefinitionId = String(formData.get('roleDefinitionId') ?? '').trim();

  if (!roleDefinitionId) {
    throwError(ERR.INVALID_INPUT, 'Role definition ID is required');
  }

  const parsed = governanceRoleActionSchema.parse({
    scope: formData.get('scope'),
    key: formData.get('key'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    hierarchyRank: parseNullableNumber(formData.get('hierarchyRank')),
    isDefault: parseCheckboxValue(formData, 'isDefault'),
    isAssignable: parseCheckboxValue(formData, 'isAssignable'),
    isActive: parseCheckboxValue(formData, 'isActive'),
  });

  const role = await updatePlatformRoleWorkflow({
    roleDefinitionId,
    ...parsed,
    description: parsed.description || null,
    permissionIds: parsePermissionIds(formData),
  });

  await logRoleAdminAction({
    session,
    action: 'role.update',
    entityId: role.id,
    description: `Role definition ${role.key} updated.`,
  });

  return {
    roleDefinitionId: role.id,
    successMessage: `${role.name} updated successfully.`,
  };
});

const toggleRoleDefinitionActiveActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const roleDefinitionId = String(formData.get('roleDefinitionId') ?? '').trim();
    const isActive =
      String(formData.get('isActive') ?? '').trim().toLowerCase() === 'true';

    if (!roleDefinitionId) {
      throwError(ERR.INVALID_INPUT, 'Role definition ID is required');
    }

    const roleDefinition = await setRoleDefinitionActive(roleDefinitionId, isActive);

    await logRoleAdminAction({
      session,
      action: isActive ? 'role.activate' : 'role.deactivate',
      entityId: roleDefinition.id,
      description: `Role definition ${roleDefinition.key} ${
        isActive ? 'activated' : 'deactivated'
      }.`,
    });

    return {
      roleDefinitionId: roleDefinition.id,
      successMessage: `Role ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
);

const deleteRoleDefinitionAdminActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const roleDefinitionId = String(formData.get('roleDefinitionId') ?? '').trim();

    if (!roleDefinitionId) {
      throwError(ERR.INVALID_INPUT, 'Role definition ID is required');
    }

    await deletePlatformRoleWorkflow(roleDefinitionId);

    await logRoleAdminAction({
      session,
      action: 'role.delete',
      entityId: roleDefinitionId,
      description: 'Role definition deleted.',
    });

    return {
      successMessage: 'Role deleted successfully.',
    };
  },
);

export async function createRoleAdminAction(formData: FormData) {
  return createRoleAdminActionImpl(formData);
}

export async function updateRoleAdminAction(formData: FormData) {
  return updateRoleAdminActionImpl(formData);
}

export async function toggleRoleDefinitionActiveAction(formData: FormData) {
  return toggleRoleDefinitionActiveActionImpl(formData);
}

export async function deleteRoleDefinitionAdminAction(formData: FormData) {
  return deleteRoleDefinitionAdminActionImpl(formData);
}
