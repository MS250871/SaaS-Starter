import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { syncManagedWorkspaceDomain } from '@/modules/workspace/services/domain-provider.services';
import {
  applyWorkspaceCustomDomainVerificationResult,
  getWorkspaceCustomDomainVerificationSnapshot,
} from '@/modules/workspace/services/domain-verification.services';

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

  return withUnitOfWork(() =>
    applyWorkspaceCustomDomainVerificationResult({
      workspaceDomainId: input.workspaceDomainId,
      managedState,
    }),
  );
}
