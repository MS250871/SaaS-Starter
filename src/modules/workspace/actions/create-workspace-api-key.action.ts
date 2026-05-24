'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createAction } from '@/lib/http/create-action';
import { assertPermission } from '@/modules/permissions/services/permissions.services';
import {
  createWorkspaceApiKeyActionSchema,
  type CreateWorkspaceApiKeyActionInput,
} from '@/modules/workspace/schema';
import { createWorkspaceApiKeyWorkflow } from '@/modules/workspace/workflows/create-workspace-api-key.workflow';

const createWorkspaceApiKeyActionImpl = createAction(async (formData: FormData) => {
  const parsed: CreateWorkspaceApiKeyActionInput =
    createWorkspaceApiKeyActionSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') ?? '',
      expiresAt: formData.get('expiresAt') ?? '',
      scopes: formData.getAll('scopes').map(String),
    });
  const session = await getUserSession();

  if (!session?.workspaceId || !session.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertPermission(session.permissions, 'apiKey.create');

  const result = await createWorkspaceApiKeyWorkflow({
    workspaceId: session.workspaceId,
    createdById: session.identityId,
    name: parsed.name,
    description: parsed.description || null,
    expiresAt: parsed.expiresAt || null,
    scopes: parsed.scopes,
  });

  return {
    successMessage: `${result.name} created successfully.`,
    ...result,
  };
}, {
  audit: {
    onSuccess: ({ result }) => ({
      scope: 'WORKSPACE',
      category: 'SECURITY',
      source: 'WORKSPACE_APP',
      action: 'workspace.apiKey.create',
      entityType: 'ApiKey',
      entityId: result.apiKeyId,
      description: `Workspace API key ${result.name} created.`,
      newValue: {
        expiresAt: result.expiresAt,
        keyPrefix: result.keyPrefix,
        name: result.name,
        scopes: result.scopes,
      },
    }),
  },
});

export async function createWorkspaceApiKeyAction(formData: FormData) {
  return createWorkspaceApiKeyActionImpl(formData);
}
