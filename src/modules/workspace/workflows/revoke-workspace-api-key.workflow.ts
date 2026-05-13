import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  getWorkspaceApiKeyById,
  revokeApiKey,
} from '@/modules/workspace/services/apikey.services';

export async function revokeWorkspaceApiKeyWorkflow(input: {
  workspaceId: string;
  apiKeyId: string;
}) {
  return withUnitOfWork(async () => {
    const apiKey = await getWorkspaceApiKeyById(
      input.workspaceId,
      input.apiKeyId,
    );

    await revokeApiKey(apiKey.id);

    return {
      apiKeyId: apiKey.id,
      name: apiKey.name,
    };
  });
}
