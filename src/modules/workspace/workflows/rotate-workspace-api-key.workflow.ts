import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { rotateApiKey } from '@/modules/workspace/services/apikey.services';

export async function rotateWorkspaceApiKeyWorkflow(input: {
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

    const result = await rotateApiKey(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      plainTextKey: result.plainTextKey,
      keyPrefix: result.apiKey.keyPrefix,
    };
  });
}
