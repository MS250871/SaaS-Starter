'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
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

function buildRoleAuditInput(params: {
  action: string;
  entityId: string;
  description: string;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'GOVERNANCE' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: 'RoleDefinition',
    entityId: params.entityId,
    description: params.description,
  };
}

const createRoleAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();

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

  return {
    roleDefinitionId: role.id,
    successMessage: `${role.name} created successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ result, args }) => {
      const formData = args[0];
      const roleKey = String(formData.get('key') ?? '').trim();

      return buildRoleAuditInput({
        action: 'role.create',
        entityId: result.roleDefinitionId,
        description: `Role definition ${roleKey} created.`,
      });
    },
  },
});

const updateRoleAdminActionImpl = createTxAction(async (formData: FormData) => {
  await requirePlatformAdminSession();
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

  return {
    roleDefinitionId: role.id,
    successMessage: `${role.name} updated successfully.`,
  };
}, {
  audit: {
    onSuccess: ({ result, args }) => {
      const formData = args[0];
      const roleKey = String(formData.get('key') ?? '').trim();

      return buildRoleAuditInput({
        action: 'role.update',
        entityId: result.roleDefinitionId,
        description: `Role definition ${roleKey} updated.`,
      });
    },
  },
});

const toggleRoleDefinitionActiveActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const roleDefinitionId = String(formData.get('roleDefinitionId') ?? '').trim();
    const isActive =
      String(formData.get('isActive') ?? '').trim().toLowerCase() === 'true';

    if (!roleDefinitionId) {
      throwError(ERR.INVALID_INPUT, 'Role definition ID is required');
    }

    const roleDefinition = await setRoleDefinitionActive(roleDefinitionId, isActive);

    return {
      roleDefinitionId: roleDefinition.id,
      successMessage: `Role ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const isActive =
          String(formData.get('isActive') ?? '').trim().toLowerCase() ===
          'true';

        return buildRoleAuditInput({
          action: isActive ? 'role.activate' : 'role.deactivate',
          entityId: result.roleDefinitionId,
          description: `Role definition ${
            isActive ? 'activated' : 'deactivated'
          }.`,
        });
      },
    },
  },
);

const deleteRoleDefinitionAdminActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const roleDefinitionId = String(formData.get('roleDefinitionId') ?? '').trim();

    if (!roleDefinitionId) {
      throwError(ERR.INVALID_INPUT, 'Role definition ID is required');
    }

    await deletePlatformRoleWorkflow(roleDefinitionId);

    return {
      successMessage: 'Role deleted successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args }) => {
        const formData = args[0];
        const roleDefinitionId = String(
          formData.get('roleDefinitionId') ?? '',
        ).trim();

        return buildRoleAuditInput({
          action: 'role.delete',
          entityId: roleDefinitionId,
          description: 'Role definition deleted.',
        });
      },
    },
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
