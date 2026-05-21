'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { assertPlatformPermission } from '@/modules/platform/platform-admin-access';
import {
  workspaceFeatureOverrideActionSchema,
  workspaceLimitOverrideActionSchema,
  workspaceOverrideDeleteActionSchema,
} from '@/modules/entitlements/schema';
import {
  deleteWorkspaceFeatureOverrideWorkflow,
  deleteWorkspaceLimitOverrideWorkflow,
  saveWorkspaceFeatureOverrideWorkflow,
  saveWorkspaceLimitOverrideWorkflow,
  syncWorkspaceFeatureOverridesWorkflow,
  syncWorkspaceLimitOverridesWorkflow,
} from '@/modules/entitlements/workflows/workspace-override-admin.workflows';

function parseCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

async function requirePlatformOverridePermission(required: string) {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformPermission({
    roleSystemKeys: session.platformRoleSystemKeys ?? [],
    roleKeys: session.platformRoleKeys ?? [],
    permissions: session.permissions ?? [],
    required,
  });

  return session;
}

const createWorkspaceFeatureOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('featureOverride.create');

    const parsed = workspaceFeatureOverrideActionSchema.parse({
      workspaceId: formData.get('workspaceId'),
      featureId: formData.get('featureId'),
      isEnabled: parseCheckboxValue(formData, 'isEnabled'),
    });

    const override = await saveWorkspaceFeatureOverrideWorkflow({
      workspaceId: parsed.workspaceId,
      featureId: parsed.featureId,
      isEnabled: parsed.isEnabled,
    });

    return {
      overrideId: override.id,
      successMessage: 'Feature override saved successfully.',
    };
  },
);

const syncWorkspaceFeatureOverridesActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('featureOverride.update');

    const workspaceId = String(formData.get('workspaceId') ?? '').trim();

    if (!workspaceId) {
      throwError(ERR.INVALID_INPUT, 'Workspace is required');
    }

    const enabledFeatureIds = formData.getAll('featureIds').map(String);

    const result = await syncWorkspaceFeatureOverridesWorkflow({
      workspaceId,
      enabledFeatureIds,
    });

    return {
      workspaceId: result.workspaceId,
      successMessage: 'Workspace feature overrides updated successfully.',
    };
  },
);

const updateWorkspaceFeatureOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('featureOverride.update');

    const overrideId = String(formData.get('overrideId') ?? '').trim();

    if (!overrideId) {
      throwError(ERR.INVALID_INPUT, 'Feature override is required');
    }

    const parsed = workspaceFeatureOverrideActionSchema.parse({
      workspaceId: formData.get('workspaceId'),
      featureId: formData.get('featureId'),
      isEnabled: parseCheckboxValue(formData, 'isEnabled'),
    });

    const override = await saveWorkspaceFeatureOverrideWorkflow({
      overrideId,
      workspaceId: parsed.workspaceId,
      featureId: parsed.featureId,
      isEnabled: parsed.isEnabled,
    });

    return {
      overrideId: override.id,
      successMessage: 'Feature override updated successfully.',
    };
  },
);

const deleteWorkspaceFeatureOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('featureOverride.delete');

    const parsed = workspaceOverrideDeleteActionSchema.parse({
      overrideId: formData.get('overrideId'),
    });

    await deleteWorkspaceFeatureOverrideWorkflow(parsed.overrideId);

    return {
      successMessage: 'Feature override deleted successfully.',
    };
  },
);

const createWorkspaceLimitOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('limitOverride.create');

    const parsed = workspaceLimitOverrideActionSchema.parse({
      workspaceId: formData.get('workspaceId'),
      limitDefinitionId: formData.get('limitDefinitionId'),
      valueInt: formData.get('valueInt'),
    });

    const override = await saveWorkspaceLimitOverrideWorkflow({
      workspaceId: parsed.workspaceId,
      limitDefinitionId: parsed.limitDefinitionId,
      valueInt: parsed.valueInt,
    });

    return {
      overrideId: override.id,
      successMessage: 'Limit override saved successfully.',
    };
  },
);

const updateWorkspaceLimitOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('limitOverride.update');

    const overrideId = String(formData.get('overrideId') ?? '').trim();

    if (!overrideId) {
      throwError(ERR.INVALID_INPUT, 'Limit override is required');
    }

    const parsed = workspaceLimitOverrideActionSchema.parse({
      workspaceId: formData.get('workspaceId'),
      limitDefinitionId: formData.get('limitDefinitionId'),
      valueInt: formData.get('valueInt'),
    });

    const override = await saveWorkspaceLimitOverrideWorkflow({
      overrideId,
      workspaceId: parsed.workspaceId,
      limitDefinitionId: parsed.limitDefinitionId,
      valueInt: parsed.valueInt,
    });

    return {
      overrideId: override.id,
      successMessage: 'Limit override updated successfully.',
    };
  },
);

const syncWorkspaceLimitOverridesActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('limitOverride.update');

    const workspaceId = String(formData.get('workspaceId') ?? '').trim();

    if (!workspaceId) {
      throwError(ERR.INVALID_INPUT, 'Workspace is required');
    }

    const limitDefinitionIds = formData.getAll('limitDefinitionIds').map(String);
    const valueInts = formData.getAll('valueInts').map(String);

    if (limitDefinitionIds.length !== valueInts.length) {
      throwError(ERR.INVALID_INPUT, 'Limit values could not be matched');
    }

    const limitValues = limitDefinitionIds.map((limitDefinitionId, index) =>
      workspaceLimitOverrideActionSchema.parse({
        workspaceId,
        limitDefinitionId,
        valueInt: valueInts[index],
      }),
    );

    const result = await syncWorkspaceLimitOverridesWorkflow({
      workspaceId,
      limitValues: limitValues.map((entry) => ({
        limitDefinitionId: entry.limitDefinitionId,
        valueInt: entry.valueInt,
      })),
    });

    return {
      workspaceId: result.workspaceId,
      successMessage: 'Workspace limit overrides updated successfully.',
    };
  },
);

const deleteWorkspaceLimitOverrideActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformOverridePermission('limitOverride.delete');

    const parsed = workspaceOverrideDeleteActionSchema.parse({
      overrideId: formData.get('overrideId'),
    });

    await deleteWorkspaceLimitOverrideWorkflow(parsed.overrideId);

    return {
      successMessage: 'Limit override deleted successfully.',
    };
  },
);

export async function createWorkspaceFeatureOverrideAction(formData: FormData) {
  return createWorkspaceFeatureOverrideActionImpl(formData);
}

export async function syncWorkspaceFeatureOverridesAction(formData: FormData) {
  return syncWorkspaceFeatureOverridesActionImpl(formData);
}

export async function updateWorkspaceFeatureOverrideAction(formData: FormData) {
  return updateWorkspaceFeatureOverrideActionImpl(formData);
}

export async function deleteWorkspaceFeatureOverrideAction(formData: FormData) {
  return deleteWorkspaceFeatureOverrideActionImpl(formData);
}

export async function createWorkspaceLimitOverrideAction(formData: FormData) {
  return createWorkspaceLimitOverrideActionImpl(formData);
}

export async function updateWorkspaceLimitOverrideAction(formData: FormData) {
  return updateWorkspaceLimitOverrideActionImpl(formData);
}

export async function syncWorkspaceLimitOverridesAction(formData: FormData) {
  return syncWorkspaceLimitOverridesActionImpl(formData);
}

export async function deleteWorkspaceLimitOverrideAction(formData: FormData) {
  return deleteWorkspaceLimitOverrideActionImpl(formData);
}
