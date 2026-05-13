import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  getWorkspaceApiKeyById,
  rotateApiKey,
} from '@/modules/workspace/services/apikey.services';

export async function rotateWorkspaceApiKeyWorkflow(input: {
  workspaceId: string;
  apiKeyId: string;
}) {
  return withUnitOfWork(async () => {
    const apiKey = await getWorkspaceApiKeyById(
      input.workspaceId,
      input.apiKeyId,
    );

    const result = await rotateApiKey(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      plainTextKey: result.plainTextKey,
      keyPrefix: result.apiKey.keyPrefix,
    };
  });
}
