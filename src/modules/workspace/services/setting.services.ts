import {
  workspaceSettingsCrud,
  workspaceSettingsQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get workspace settings
 */
export async function getWorkspaceSettings(workspaceId: string) {
  return workspaceSettingsQueries.findFirst({
    where: {
      workspaceId,
    },
  });
}

/**
 * Create workspace settings
 */
export async function createWorkspaceSettings(
  data: CreateInput<'WorkspaceSettings'>,
) {
  return workspaceSettingsCrud.create(data);
}

/**
 * Update workspace settings
 */
export async function updateWorkspaceSettings(
  id: string,
  data: UpdateInput<'WorkspaceSettings'>,
) {
  return workspaceSettingsCrud.update(id, data);
}

/**
 * Upsert workspace settings
 */
export async function upsertWorkspaceSettings(params: {
  workspaceId: string;
  themes?: any;
  settings?: any;
}) {
  const existing = await getWorkspaceSettings(params.workspaceId);

  if (!existing) {
    return workspaceSettingsCrud.create({
      workspaceId: params.workspaceId,
      themes: params.themes ?? {},
      settings: params.settings ?? {},
    });
  }

  return workspaceSettingsCrud.update(existing.id, {
    themes: params.themes ?? existing.themes,
    settings: params.settings ?? existing.settings,
  });
}

/**
 * Update theme only
 */
export async function updateWorkspaceTheme(workspaceId: string, themes: any) {
  return upsertWorkspaceSettings({
    workspaceId,
    themes,
  });
}

/**
 * Update settings only
 */
export async function updateWorkspaceConfig(
  workspaceId: string,
  settings: any,
) {
  return upsertWorkspaceSettings({
    workspaceId,
    settings,
  });
}
