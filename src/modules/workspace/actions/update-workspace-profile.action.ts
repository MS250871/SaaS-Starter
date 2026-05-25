'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import { buildWorkspaceProfileAssetPreviewUrls } from '@/modules/workspace/services/workspace-profile-assets.services';
import {
  type UpdateWorkspaceProfileActionInput,
  type UpdateWorkspaceProfileDomain,
  updateWorkspaceProfileActionSchema,
  updateWorkspaceProfileSchema,
} from '@/modules/workspace/schema';
import { updateWorkspaceProfileWorkflow } from '@/modules/workspace/workflows/update-workspace-profile.workflow';

function getUploadedFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value === 'string' || !value || value.size === 0) {
    return null;
  }

  return value;
}

const updateWorkspaceProfileActionImpl = createAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: UpdateWorkspaceProfileActionInput =
    updateWorkspaceProfileActionSchema.parse(raw);
  const profile: UpdateWorkspaceProfileDomain =
    updateWorkspaceProfileSchema.parse(parsed);
  const logoFile = getUploadedFile(formData, 'logoFile');
  const faviconFile = getUploadedFile(formData, 'faviconFile');

  const session = await getUserSession();

  if (!session?.workspaceId || !session.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertPermission(session.permissions, 'workspaceSettings.update');

  const result = await updateWorkspaceProfileWorkflow({
    workspaceId: session.workspaceId,
    identityId: session.identityId,
    profile,
    logoFile,
    faviconFile,
  });

  return {
    successMessage: 'Workspace profile updated',
    workspaceId: result.workspaceId,
    profile: result.profile,
    assetPreviewUrls: await buildWorkspaceProfileAssetPreviewUrls({
      workspaceId: result.workspaceId,
      logoMediaId: result.profile.branding?.logoMediaId ?? null,
      faviconMediaId: result.profile.branding?.faviconMediaId ?? null,
    }),
  };
}, {
  audit: {
    onSuccess: ({ result }) => ({
      scope: 'WORKSPACE',
      category: 'WORKSPACE',
      source: 'WORKSPACE_APP',
      action: 'workspace.profile.update',
      entityType: 'Workspace',
      entityId: result.workspaceId,
      description: 'Workspace profile updated.',
      newValue: result.profile,
    }),
  },
});

export async function updateWorkspaceProfileAction(formData: FormData) {
  return updateWorkspaceProfileActionImpl(formData);
}
