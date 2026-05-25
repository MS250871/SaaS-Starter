import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getWorkspaceProfileAssetAccess } from '@/modules/workspace/services/workspace-profile-assets.services';

export async function getWorkspaceProfileAssetAccessWorkflow(input: {
  workspaceId: string;
  mediaId: string;
}) {
  return withUnitOfWork(async () => {
    return getWorkspaceProfileAssetAccess(input);
  });
}
