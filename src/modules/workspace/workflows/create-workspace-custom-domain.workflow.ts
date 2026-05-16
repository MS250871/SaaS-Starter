import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { WorkspaceDomainRoutingMode } from '@/generated/prisma/client';
import type { ManagedWorkspaceRedirectConfig } from '@/modules/workspace/services/domain-provider.types';
import { cleanupManagedWorkspaceDomain, provisionManagedWorkspaceDomain } from '@/modules/workspace/services/domain-provider.services';
import { createWorkspaceCustomDomainSetup } from '@/modules/workspace/services/domain-verification.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';

export async function createWorkspaceCustomDomainWorkflow(input: {
  workspaceId: string;
  domain: string;
  isPrimary?: boolean;
  routingMode?: WorkspaceDomainRoutingMode;
  redirect?: ManagedWorkspaceRedirectConfig;
}) {
  const routingMode = input.routingMode ?? WorkspaceDomainRoutingMode.CNAME;
  const managedState = await provisionManagedWorkspaceDomain({
    domain: input.domain,
    routingMode,
    redirect: input.redirect,
  });

  try {
    const result = await withUnitOfWork(() =>
      createWorkspaceCustomDomainSetup({
        ...input,
        routingMode,
        managedState,
      }),
    );

    await withUnitOfWork(() => syncWorkspaceRoutingState(input.workspaceId));

    return result;
  } catch (error) {
    await cleanupManagedWorkspaceDomain(input.domain).catch(() => undefined);
    throw error;
  }
}
