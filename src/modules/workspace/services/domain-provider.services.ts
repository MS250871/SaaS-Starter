import { WorkspaceDomainRoutingMode } from '@/generated/prisma/client';
import type {
  ManagedWorkspaceDnsRecord,
  ManagedWorkspaceRedirectConfig,
  ManagedWorkspaceDomainState,
} from '@/modules/workspace/services/domain-provider.types';
import {
  provisionCustomDomainViaVercel,
  removeCustomDomainFromVercel,
  syncCustomDomainViaVercel,
} from '@/modules/workspace/services/vercel-domain-provider.services';
export type { ManagedWorkspaceDnsRecord, ManagedWorkspaceDomainState };

export async function provisionManagedWorkspaceDomain(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
  redirect?: ManagedWorkspaceRedirectConfig;
}) {
  return provisionCustomDomainViaVercel(params);
}

export async function syncManagedWorkspaceDomain(params: {
  domain: string;
  routingMode: WorkspaceDomainRoutingMode;
}) {
  return syncCustomDomainViaVercel(params);
}

export async function cleanupManagedWorkspaceDomain(domain: string) {
  return removeCustomDomainFromVercel(domain);
}

export function getManagedWorkspaceDomainProviderLabel() {
  return 'Vercel';
}
