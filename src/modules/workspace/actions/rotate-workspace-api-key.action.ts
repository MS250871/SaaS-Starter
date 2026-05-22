'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/services/permissions.services';
import {
  rotateWorkspaceApiKeyActionSchema,
  type RotateWorkspaceApiKeyActionInput,
} from '@/modules/workspace/schema';
import { rotateWorkspaceApiKeyWorkflow } from '@/modules/workspace/workflows/rotate-workspace-api-key.workflow';

function assertCanRotateApiKey(permissions: string[]) {
  if (
    hasPermission(permissions, 'apiKey.rotate') ||
    hasPermission(permissions, 'apiKey.update')
  ) {
    return;
  }

  assertPermission(permissions, 'apiKey.rotate');
}

const rotateWorkspaceApiKeyActionImpl = createAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: RotateWorkspaceApiKeyActionInput =
    rotateWorkspaceApiKeyActionSchema.parse(raw);
  const session = await getUserSession();

  if (!session?.workspaceId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertCanRotateApiKey(session.permissions);

  const result = await rotateWorkspaceApiKeyWorkflow({
    workspaceId: session.workspaceId,
    apiKeyId: parsed.apiKeyId,
  });

  return {
    successMessage: `${result.name} rotated successfully.`,
    ...result,
  };
});

export async function rotateWorkspaceApiKeyAction(formData: FormData) {
  return rotateWorkspaceApiKeyActionImpl(formData);
}
