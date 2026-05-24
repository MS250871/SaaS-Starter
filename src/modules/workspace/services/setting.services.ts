import {
  workspaceSettingsCrud,
  workspaceSettingsQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { readWorkspaceSettingsCache } from '@/modules/workspace/services/workspace-cache.services';

/**
 * Get settings
 */
export async function getWorkspaceSettings(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  return readWorkspaceSettingsCache(workspaceId, () =>
    workspaceSettingsQueries.findFirst({
      where: { workspaceId },
    }),
  );
}

export async function getWorkspaceThemeSnapshot(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  const settings = await getWorkspaceSettings(workspaceId);

  return {
    themes: settings?.themes ?? null,
  };
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
  themes?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
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
    themes:
      params.themes ??
      (existing.themes === null ? Prisma.JsonNull : existing.themes),
    settings:
      params.settings ??
      (existing.settings === null ? Prisma.JsonNull : existing.settings),
  });
}

export async function updateWorkspaceTheme(
  workspaceId: string,
  themes: Prisma.InputJsonValue,
) {
  return upsertWorkspaceSettings({ workspaceId, themes });
}

export async function updateWorkspaceConfig(
  workspaceId: string,
  settings: Prisma.InputJsonValue,
) {
  return upsertWorkspaceSettings({ workspaceId, settings });
}

type WorkspaceSettingsJson = {
  domain?: {
    strategy?: string | null;
    [key: string]: unknown;
  };
  billing?: {
    planCode?: string | null;
    subscriptionStatus?: string | null;
    trialStartsAt?: string | null;
    trialEndsAt?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export async function syncWorkspaceBillingSettings(params: {
  workspaceId: string;
  planCode: string;
  subscriptionStatus: string;
  domainStrategy?: string;
}) {
  if (!params.workspaceId || !params.planCode || !params.subscriptionStatus) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId, planCode and subscriptionStatus are required',
    );
  }

  const existing = await getWorkspaceSettings(params.workspaceId);
  const currentSettings =
    existing?.settings && typeof existing.settings === 'object'
      ? (existing.settings as unknown as WorkspaceSettingsJson)
      : {};

  const nextSettings: WorkspaceSettingsJson = {
    ...currentSettings,
    domain: {
      ...(currentSettings.domain ?? {}),
      ...(params.domainStrategy ? { strategy: params.domainStrategy } : {}),
    },
    billing: {
      ...(currentSettings.billing ?? {}),
      planCode: params.planCode,
      subscriptionStatus: params.subscriptionStatus,
      trialStartsAt: null,
      trialEndsAt: null,
    },
  };

  return updateWorkspaceConfig(
    params.workspaceId,
    nextSettings as Prisma.InputJsonValue,
  );
}
