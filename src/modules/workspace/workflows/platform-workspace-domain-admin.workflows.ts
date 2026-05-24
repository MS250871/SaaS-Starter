import { WorkspaceDomainType } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { invalidateWorkspaceSurfaceCaches } from '@/modules/workspace/services/workspace-cache.services';
import { cleanupManagedWorkspaceDomain } from '@/modules/workspace/services/domain-provider.services';
import {
  deleteWorkspaceDomain,
  findPrimaryWorkspaceCustomDomain,
  findWorkspaceRedirectAlias,
  getDomainById,
  getWorkspaceDomainEntitlements,
  setPrimaryWorkspaceDomain,
} from '@/modules/workspace/services/domains.services';
import { syncWorkspaceRoutingState } from '@/modules/workspace/services/workspace-routing.services';
import { createWorkspaceCustomDomainWorkflow } from '@/modules/workspace/workflows/create-workspace-custom-domain.workflow';
import { refreshWorkspaceCustomDomainVerificationWorkflow } from '@/modules/workspace/workflows/refresh-workspace-custom-domain-verification.workflow';

function assertWorkspaceCanUseCustomDomains(params: {
  featureKeys: string[];
  customDomainSlots: number;
}) {
  const hasCustomDomainFeature =
    params.featureKeys.includes('domain_custom') || params.customDomainSlots > 0;

  if (!hasCustomDomainFeature) {
    throwError(
      ERR.FORBIDDEN,
      'White-label custom domains are not enabled for this workspace.',
    );
  }
}

export async function resyncPlatformWorkspaceRoutingWorkflow(input: {
  workspaceId: string;
}) {
  const result = await syncWorkspaceRoutingState(input.workspaceId);
  await invalidateWorkspaceSurfaceCaches(input.workspaceId);
  return result;
}

export async function createPlatformWorkspaceCustomDomainWorkflow(input: {
  workspaceId: string;
  domain: string;
  routingMode: 'CNAME' | 'APEX_A';
}) {
  const { customDomainSetupCount, entitlements } =
    await getWorkspaceDomainEntitlements(input.workspaceId);
  const customDomainSlots = entitlements.limits.max_custom_domains ?? 0;

  assertWorkspaceCanUseCustomDomains({
    featureKeys: entitlements.features,
    customDomainSlots,
  });

  if (customDomainSlots > 0 && customDomainSetupCount >= customDomainSlots) {
    throwError(
      ERR.INVALID_STATE,
      `White-label setup limit reached for this workspace (${customDomainSlots})`,
    );
  }

  return createWorkspaceCustomDomainWorkflow({
    workspaceId: input.workspaceId,
    domain: input.domain,
    routingMode: input.routingMode,
  });
}

export async function createPlatformWorkspaceRedirectAliasWorkflow(input: {
  workspaceId: string;
  domain: string;
  routingMode: 'CNAME' | 'APEX_A';
}) {
  const { entitlements } = await getWorkspaceDomainEntitlements(input.workspaceId);
  const customDomainSlots = entitlements.limits.max_custom_domains ?? 0;

  assertWorkspaceCanUseCustomDomains({
    featureKeys: entitlements.features,
    customDomainSlots,
  });

  const primaryRouteDomain = await findPrimaryWorkspaceCustomDomain(
    input.workspaceId,
  );

  if (!primaryRouteDomain) {
    throwError(
      ERR.INVALID_STATE,
      'Add a primary custom domain before creating a redirect alias.',
    );
  }

  const existingRedirectAlias = await findWorkspaceRedirectAlias(input.workspaceId);

  if (existingRedirectAlias) {
    throwError(
      ERR.INVALID_STATE,
      'A redirect alias is already configured for this workspace.',
    );
  }

  return createWorkspaceCustomDomainWorkflow({
    workspaceId: input.workspaceId,
    domain: input.domain,
    isPrimary: false,
    routingMode: input.routingMode,
    redirect: {
      destination: primaryRouteDomain.domain,
      statusCode: 308,
    },
  });
}

export async function refreshPlatformWorkspaceDomainVerificationWorkflow(input: {
  workspaceDomainId: string;
}) {
  const domain = await withUnitOfWork(() => getDomainById(input.workspaceDomainId));

  if (domain.type !== WorkspaceDomainType.CUSTOM) {
    throwError(
      ERR.INVALID_STATE,
      'Verification checks are only available for custom workspace domains.',
    );
  }

  return refreshWorkspaceCustomDomainVerificationWorkflow({
    workspaceDomainId: input.workspaceDomainId,
  });
}

export async function setPlatformWorkspacePrimaryDomainWorkflow(input: {
  workspaceDomainId: string;
}) {
  const domain = await withUnitOfWork(() => getDomainById(input.workspaceDomainId));

  if (domain.type !== WorkspaceDomainType.CUSTOM) {
    throwError(
      ERR.INVALID_STATE,
      'Only verified custom domains can be promoted to the primary route.',
    );
  }

  if (!domain.isVerified) {
    throwError(
      ERR.INVALID_STATE,
      'Only verified custom domains can be promoted to the primary route.',
    );
  }

  await withUnitOfWork(() =>
    setPrimaryWorkspaceDomain(input.workspaceDomainId, domain.workspaceId),
  );

  const result = await syncWorkspaceRoutingState(domain.workspaceId);
  await invalidateWorkspaceSurfaceCaches(domain.workspaceId);
  return result;
}

export async function deletePlatformWorkspaceDomainWorkflow(input: {
  workspaceDomainId: string;
}) {
  const domain = await withUnitOfWork(() => getDomainById(input.workspaceDomainId));

  if (domain.type !== WorkspaceDomainType.CUSTOM) {
    throwError(
      ERR.INVALID_STATE,
      'Only custom domains and redirect aliases can be deleted manually.',
    );
  }

  await cleanupManagedWorkspaceDomain(domain.domain);

  await withUnitOfWork(() => deleteWorkspaceDomain(input.workspaceDomainId));

  const result = await syncWorkspaceRoutingState(domain.workspaceId);
  await invalidateWorkspaceSurfaceCaches(domain.workspaceId);
  return result;
}
