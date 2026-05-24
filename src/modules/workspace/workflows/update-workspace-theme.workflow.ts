import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getWorkspaceSettings, upsertWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';
import type { UpdateWorkspaceThemeDomain } from '@/modules/workspace/schema';

export async function updateWorkspaceThemeWorkflow(input: {
  workspaceId: string;
  theme: UpdateWorkspaceThemeDomain;
}) {
  const result = await withUnitOfWork(async () => {
    const existing = await getWorkspaceSettings(input.workspaceId);

    const updated = await upsertWorkspaceSettings({
      workspaceId: input.workspaceId,
      themes: input.theme,
      settings: existing?.settings ?? {},
    });

    return {
      workspaceId: input.workspaceId,
      themes: updated.themes,
    };
  });

  await invalidateWorkspaceSurfaceCaches(input.workspaceId);

  return result;
}
