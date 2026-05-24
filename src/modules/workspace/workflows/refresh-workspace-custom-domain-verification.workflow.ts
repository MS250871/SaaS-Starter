import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { syncManagedWorkspaceDomain } from '@/modules/workspace/services/domain-provider.services';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';
import {
  applyWorkspaceCustomDomainVerificationResult,
  getWorkspaceCustomDomainVerificationSnapshot,
} from '@/modules/workspace/services/domain-verification.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

export async function refreshWorkspaceCustomDomainVerificationWorkflow(input: {
  workspaceDomainId: string;
}) {
  const snapshot = await withUnitOfWork(() =>
    getWorkspaceCustomDomainVerificationSnapshot(input.workspaceDomainId),
  );

  const managedState = await syncManagedWorkspaceDomain({
    domain: snapshot.domain,
    routingMode: snapshot.routingMode,
  });

  const result = await withUnitOfWork(() =>
    applyWorkspaceCustomDomainVerificationResult({
      workspaceDomainId: input.workspaceDomainId,
      managedState,
    }),
  );

  await syncWorkspaceRoutingState(snapshot.workspaceId);
  await invalidateWorkspaceSurfaceCaches(snapshot.workspaceId);

  return result;
}
