'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import {
  assertPermission,
  hasPermission,
} from '@/modules/permissions/permissions.services';
import {
  revokeWorkspaceApiKeyActionSchema,
  type RevokeWorkspaceApiKeyActionInput,
} from '@/modules/workspace/schema';
import { revokeWorkspaceApiKeyWorkflow } from '@/modules/workspace/workflows/revoke-workspace-api-key.workflow';

function assertCanRevokeApiKey(permissions: string[]) {
  if (
    hasPermission(permissions, 'apiKey.revoke') ||
    hasPermission(permissions, 'apiKey.delete') ||
    hasPermission(permissions, 'apiKey.update')
  ) {
    return;
  }

  assertPermission(permissions, 'apiKey.revoke');
}

const revokeWorkspaceApiKeyActionImpl = createAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: RevokeWorkspaceApiKeyActionInput =
    revokeWorkspaceApiKeyActionSchema.parse(raw);
  const session = await getUserSession();

  if (!session?.workspaceId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertCanRevokeApiKey(session.permissions);

  const result = await revokeWorkspaceApiKeyWorkflow({
    workspaceId: session.workspaceId,
    apiKeyId: parsed.apiKeyId,
  });

  return {
    successMessage: `${result.name} revoked successfully.`,
    ...result,
  };
});

export async function revokeWorkspaceApiKeyAction(formData: FormData) {
  return revokeWorkspaceApiKeyActionImpl(formData);
}
