import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getWorkspaceSettings, upsertWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import type { UpdateWorkspaceThemeDomain } from '@/modules/workspace/schema';

export async function updateWorkspaceThemeWorkflow(input: {
  workspaceId: string;
  theme: UpdateWorkspaceThemeDomain;
}) {
  return withUnitOfWork(async () => {
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
}
