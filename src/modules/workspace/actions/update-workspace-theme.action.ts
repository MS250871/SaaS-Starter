'use server';

import { createAction } from '@/lib/http/create-action';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  updateWorkspaceThemeActionSchema,
  updateWorkspaceThemeSchema,
  type UpdateWorkspaceThemeActionInput,
  type UpdateWorkspaceThemeDomain,
} from '@/modules/workspace/schema';
import { updateWorkspaceThemeWorkflow } from '@/modules/workspace/workflows/update-workspace-theme.workflow';

const updateWorkspaceThemeActionImpl = createAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: UpdateWorkspaceThemeActionInput =
    updateWorkspaceThemeActionSchema.parse(raw);
  const theme: UpdateWorkspaceThemeDomain = updateWorkspaceThemeSchema.parse(parsed);

  const session = await getUserSession();

  if (!session?.workspaceId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertPermission(session.permissions, 'workspaceSettings.update');

  const result = await updateWorkspaceThemeWorkflow({
    workspaceId: session.workspaceId,
    theme,
  });

  return {
    successMessage: 'Workspace theme updated',
    workspaceId: result.workspaceId,
    themes: result.themes,
  };
});

export async function updateWorkspaceThemeAction(formData: FormData) {
  return updateWorkspaceThemeActionImpl(formData);
}
