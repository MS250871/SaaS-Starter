import {
  workspaceSettingsCrud,
  workspaceSettingsQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get settings
 */
export async function getWorkspaceSettings(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  return workspaceSettingsQueries.findFirst({
    where: { workspaceId },
  });
}

/**
 * Create settings
 */
export async function createWorkspaceSettings(
  data: CreateInput<'WorkspaceSettings'>,
) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId required');
  }

  try {
    return await workspaceSettingsCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create settings', undefined, e);
  }
}

/**
 * Update settings
 */
export async function updateWorkspaceSettings(
  id: string,
  data: UpdateInput<'WorkspaceSettings'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Settings ID required');

  try {
    return await workspaceSettingsCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update settings', undefined, e);
  }
}

/**
 * Upsert
 */
export async function upsertWorkspaceSettings(params: {
  workspaceId: string;
  themes?: any;
  settings?: any;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId required');
  }

  const existing = await getWorkspaceSettings(params.workspaceId);

  if (!existing) {
    return createWorkspaceSettings({
      workspaceId: params.workspaceId,
      themes: params.themes ?? {},
      settings: params.settings ?? {},
    });
  }

  return updateWorkspaceSettings(existing.id, {
    themes: params.themes ?? existing.themes,
    settings: params.settings ?? existing.settings,
  });
}

export async function updateWorkspaceTheme(workspaceId: string, themes: any) {
  return upsertWorkspaceSettings({ workspaceId, themes });
}

export async function updateWorkspaceConfig(
  workspaceId: string,
  settings: any,
) {
  return upsertWorkspaceSettings({ workspaceId, settings });
}
