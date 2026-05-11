import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createWorkspaceApiKey } from '@/modules/workspace/services/apikey.services';

function parseExpiryDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const expiresAt = new Date(`${trimmed}T23:59:59.999Z`);

  if (Number.isNaN(expiresAt.getTime())) {
    throwError(ERR.INVALID_INPUT, 'Enter a valid expiry date.');
  }

  return expiresAt;
}

export async function createWorkspaceApiKeyWorkflow(input: {
  workspaceId: string;
  name: string;
  description?: string | null;
  scopes: string[];
  expiresAt?: string | null;
  createdById?: string | null;
}) {
  return withUnitOfWork(async () => {
    if (!input.workspaceId) {
      throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
    }

    const result = await createWorkspaceApiKey({
      workspaceId: input.workspaceId,
      name: input.name,
      createdById: input.createdById ?? null,
      description: input.description ?? null,
      scopes: input.scopes,
      expiresAt: parseExpiryDate(input.expiresAt),
    });

    return {
      apiKeyId: result.apiKey.id,
      name: result.apiKey.name,
      plainTextKey: result.plainTextKey,
      keyPrefix: result.apiKey.keyPrefix,
      scopes: result.apiKey.scopes,
      expiresAt: result.apiKey.expiresAt?.toISOString() ?? null,
    };
  });
}
