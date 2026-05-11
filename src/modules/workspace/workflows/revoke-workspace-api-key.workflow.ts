import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { revokeApiKey } from '@/modules/workspace/services/apikey.services';

export async function revokeWorkspaceApiKeyWorkflow(input: {
  workspaceId: string;
  apiKeyId: string;
}) {
  return withUnitOfWork(async () => {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: input.apiKeyId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
      },
    });

    if (!apiKey || apiKey.workspaceId !== input.workspaceId) {
      throwError(ERR.NOT_FOUND, 'API key not found for this workspace');
    }

    await revokeApiKey(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      name: apiKey.name,
    };
  });
}
