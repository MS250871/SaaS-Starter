import { WorkspaceDomainType } from '@/generated/prisma/client';
import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformWorkspaceActiveSubscriptionAdminSnapshots } from '@/modules/billing/services/subscription.services';
import { getManagedWorkspaceDomainProviderLabel } from '@/modules/workspace/services/domain-provider.services';
import {
  getPlatformWorkspaceDomainAdminSnapshot,
  getWorkspaceDomainEntitlements,
  listWorkspaceDomainsDetailed,
} from '@/modules/workspace/services/domains.services';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { getPlatformWorkspaceAdminSnapshot } from '@/modules/workspace/services/workspace.services';
import {
  buildManagedWorkspaceSubdomain,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';

type WorkspaceSettingsShape = {
  domain?: {
    strategy?: string | null;
    rootDomain?: string | null;
    primaryHost?: string | null;
    customDomain?: string | null;
    customDomainVerified?: boolean | null;
    redirectAliases?: Array<{
      domain: string;
      redirectTo: string;
      redirectStatusCode?: number | null;
      verified?: boolean | null;
    }> | null;
  };
};

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatShortDate(value: Date | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(value);
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return 'N/A';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRoutingModeLabel(value: string | null | undefined) {
  if (value === 'APEX_A') {
    return 'Apex A records';
  }

  if (value === 'CNAME') {
    return 'CNAME';
  }

  return formatEnumLabel(value);
}

function formatDomainTypeLabel(type: WorkspaceDomainType) {
  if (type === WorkspaceDomainType.CUSTOM) {
    return 'Custom';
  }

  if (type === WorkspaceDomainType.SUBDOMAIN) {
    return 'Subdomain';
  }

  return 'Free path';
}

function formatDomainStrategyLabel(value: string | null | undefined) {
  const strategy = normalizeWorkspaceDomainStrategy(value);

  if (strategy === 'custom_domain') {
    return 'Custom domain';
  }

  if (strategy === 'subdomain') {
    return 'Subdomain';
  }

  return 'Free path';
}

function normalizeRedirectAliases(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const domain =
        typeof candidate.domain === 'string'
          ? candidate.domain.toLowerCase()
          : null;
      const redirectTo =
        typeof candidate.redirectTo === 'string'
          ? candidate.redirectTo.toLowerCase()
          : null;

      if (!domain || !redirectTo) {
        return null;
      }

      return {
        domain,
        redirectTo,
        redirectStatusCode:
          typeof candidate.redirectStatusCode === 'number'
            ? candidate.redirectStatusCode
            : null,
        verified: Boolean(candidate.verified),
      };
    })
    .filter(
      (
        item,
      ): item is {
        domain: string;
        redirectTo: string;
        redirectStatusCode: number | null;
        verified: boolean;
      } => Boolean(item),
    );
}

function normalizeRedirectStatusCode(
  value: number | null | undefined,
): 301 | 302 | 307 | 308 | null {
  if (value === 301 || value === 302 || value === 307 || value === 308) {
    return value;
  }

  return null;
}

function buildDnsHealthLabel(
  records: Array<{
    isRequired: boolean;
    isMatched: boolean;
  }>,
) {
  const requiredRecordCount = records.filter((record) => record.isRequired).length;
  const matchedRequiredRecordCount = records.filter(
    (record) => record.isRequired && record.isMatched,
  ).length;

  if (requiredRecordCount === 0) {
    return 'No checks required';
  }

  return `${matchedRequiredRecordCount}/${requiredRecordCount} matched`;
}

function buildWorkspaceCurrentHostLabel(params: {
  strategy: string | null | undefined;
  slug: string;
  primaryHost?: string | null;
  customDomain?: string | null;
  defaultDomain?: string | null;
}) {
  const strategy = normalizeWorkspaceDomainStrategy(params.strategy);

  if (strategy === 'free_path') {
    return `/${params.slug}`;
  }

  return (
    params.primaryHost ??
    params.customDomain ??
    params.defaultDomain ??
    'N/A'
  );
}

function deriveDomainBehavior(params: {
  type: WorkspaceDomainType;
  isPrimary: boolean;
  domain: string;
  redirectAliases: ReturnType<typeof normalizeRedirectAliases>;
}) {
  const matchingAlias = params.redirectAliases.find(
    (alias) => alias.domain === params.domain.toLowerCase(),
  );

  if (params.type === WorkspaceDomainType.SUBDOMAIN) {
    return {
      behavior: 'MANAGED_SUBDOMAIN' as const,
      behaviorLabel: 'Managed route',
      redirectTo: null,
      redirectStatusCode: null,
    };
  }

  if (matchingAlias) {
    return {
      behavior: 'REDIRECT_ALIAS' as const,
      behaviorLabel: 'Redirect alias',
        redirectTo: matchingAlias.redirectTo,
        redirectStatusCode:
          normalizeRedirectStatusCode(matchingAlias.redirectStatusCode) ?? 308,
    };
  }

  if (params.isPrimary) {
    return {
      behavior: 'PRIMARY_ROUTE' as const,
      behaviorLabel: 'Primary route',
      redirectTo: null,
      redirectStatusCode: null,
    };
  }

  return {
    behavior: 'SECONDARY_ROUTE' as const,
    behaviorLabel: 'Secondary route',
    redirectTo: null,
    redirectStatusCode: null,
  };
}

export type PlatformWorkspaceRoutingDomainRow = {
  id: string;
  domain: string;
  type: WorkspaceDomainType;
  typeLabel: string;
  routingModeLabel: string;
  statusLabel: string;
  isPrimary: boolean;
  isVerified: boolean;
  behavior: 'PRIMARY_ROUTE' | 'REDIRECT_ALIAS' | 'SECONDARY_ROUTE' | 'MANAGED_SUBDOMAIN';
  behaviorLabel: string;
  redirectTo: string | null;
  redirectStatusCode: 301 | 302 | 307 | 308 | null;
  target: string | null;
  dnsHealthLabel: string;
  lastCheckedAtLabel: string;
  createdAtLabel: string;
  verifiedAtLabel: string;
  lastVerificationError: string | null;
};

export async function getPlatformWorkspaceRoutingDetailPageData(
  workspaceId: string,
) {
  return withActionTxContext(async () => {
    const [workspace, settingsRecord, activeSubscription, domains, domainAccess] =
      await Promise.all([
        getPlatformWorkspaceAdminSnapshot(workspaceId),
        getWorkspaceSettings(workspaceId),
        listPlatformWorkspaceActiveSubscriptionAdminSnapshots([workspaceId]).then(
          (rows) => rows[0] ?? null,
        ),
        listWorkspaceDomainsDetailed(workspaceId),
        getWorkspaceDomainEntitlements(workspaceId),
      ]);

    const settings = (settingsRecord?.settings ?? null) as WorkspaceSettingsShape | null;
    const domainSettings = settings?.domain ?? null;
    const routeStrategy = normalizeWorkspaceDomainStrategy(
      domainSettings?.strategy,
    );
    const redirectAliases = normalizeRedirectAliases(
      domainSettings?.redirectAliases,
    );
    const rootDomain = domainSettings?.rootDomain ?? null;
    const managedSubdomainHost = rootDomain
      ? buildManagedWorkspaceSubdomain(workspace.slug, rootDomain)
      : null;

    const rows: PlatformWorkspaceRoutingDomainRow[] = domains.map((domain) => {
      const behavior = deriveDomainBehavior({
        type: domain.type,
        isPrimary: domain.isPrimary,
        domain: domain.domain,
        redirectAliases,
      });

      return {
        id: domain.id,
        domain: domain.domain,
        type: domain.type,
        typeLabel: formatDomainTypeLabel(domain.type),
        routingModeLabel: formatRoutingModeLabel(domain.routingMode),
        statusLabel: formatEnumLabel(domain.status),
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        behavior: behavior.behavior,
        behaviorLabel: behavior.behaviorLabel,
        redirectTo: behavior.redirectTo,
        redirectStatusCode: behavior.redirectStatusCode,
        target: domain.target,
        dnsHealthLabel: buildDnsHealthLabel(domain.dnsRecords),
        lastCheckedAtLabel: formatDate(domain.lastCheckedAt),
        createdAtLabel: formatShortDate(domain.createdAt),
        verifiedAtLabel: formatDate(domain.verifiedAt),
        lastVerificationError: domain.lastVerificationError,
      };
    });

    const customDomainSlots =
      domainAccess.entitlements.limits.max_custom_domains ?? 0;
    const canUseCustomDomain =
      domainAccess.entitlements.features.includes('domain_custom') ||
      customDomainSlots > 0;
    const canUseSubdomain =
      domainAccess.entitlements.features.includes('domain_subdomain') ||
      canUseCustomDomain ||
      (domainAccess.entitlements.limits.max_subdomains ?? 0) > 0;
    const primaryCustomDomain = rows.find(
      (row) => row.type === WorkspaceDomainType.CUSTOM && row.behavior === 'PRIMARY_ROUTE',
    );
    const redirectAlias = rows.find((row) => row.behavior === 'REDIRECT_ALIAS');

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isActive: workspace.isActive,
        primaryEmail: workspace.primaryEmail,
        defaultDomain: workspace.defaultDomain,
        routeStrategyLabel: formatDomainStrategyLabel(routeStrategy),
        currentHostLabel: buildWorkspaceCurrentHostLabel({
          strategy: routeStrategy,
          slug: workspace.slug,
          primaryHost: domainSettings?.primaryHost,
          customDomain: domainSettings?.customDomain,
          defaultDomain: workspace.defaultDomain,
        }),
        pathAccessLabel: `/${workspace.slug}`,
        managedSubdomainHost: managedSubdomainHost ?? 'N/A',
        rootDomain: rootDomain ?? 'N/A',
        createdAtLabel: formatDate(workspace.createdAt),
        activePlanName: activeSubscription?.price.product.plan?.name ?? null,
        activePlanKey: activeSubscription?.price.product.plan?.key ?? null,
        activeSubscriptionStatus: activeSubscription?.status ?? null,
        renewalAtLabel: formatDate(activeSubscription?.currentPeriodEnd),
      },
      entitlements: {
        canUseSubdomain,
        canUseCustomDomain,
        customDomainSlots,
        currentCustomDomainCount: domainAccess.customDomainSetupCount,
        remainingCustomDomainSlots:
          customDomainSlots > 0
            ? Math.max(customDomainSlots - domainAccess.customDomainSetupCount, 0)
            : 0,
      },
      summary: {
        total: rows.length,
        verified: rows.filter((row) => row.isVerified).length,
        custom: rows.filter((row) => row.type === WorkspaceDomainType.CUSTOM).length,
        aliases: rows.filter((row) => row.behavior === 'REDIRECT_ALIAS').length,
      },
      providerLabel: getManagedWorkspaceDomainProviderLabel(),
      hasPrimaryCustomDomain: Boolean(primaryCustomDomain),
      hasRedirectAlias: Boolean(redirectAlias),
      rows,
    };
  });
}

export async function getPlatformWorkspaceDomainDetailPageData(domainId: string) {
  return withActionTxContext(async () => {
    const domain = await getPlatformWorkspaceDomainAdminSnapshot(domainId);
    const settingsRecord = await getWorkspaceSettings(domain.workspace.id);
    const settings = (settingsRecord?.settings ?? null) as WorkspaceSettingsShape | null;
    const domainSettings = settings?.domain ?? null;
    const redirectAliases = normalizeRedirectAliases(domainSettings?.redirectAliases);
    const behavior = deriveDomainBehavior({
      type: domain.type,
      isPrimary: domain.isPrimary,
      domain: domain.domain,
      redirectAliases,
    });

    return {
      workspace: {
        id: domain.workspace.id,
        name: domain.workspace.name,
        slug: domain.workspace.slug,
        isActive: domain.workspace.isActive,
        primaryEmail: domain.workspace.primaryEmail,
        currentHostLabel: buildWorkspaceCurrentHostLabel({
          strategy: domainSettings?.strategy,
          slug: domain.workspace.slug,
          primaryHost: domainSettings?.primaryHost,
          customDomain: domainSettings?.customDomain,
          defaultDomain: domain.workspace.defaultDomain,
        }),
        routeStrategyLabel: formatDomainStrategyLabel(domainSettings?.strategy),
      },
      domain: {
        id: domain.id,
        workspaceId: domain.workspaceId,
        domain: domain.domain,
        type: domain.type,
        typeLabel: formatDomainTypeLabel(domain.type),
        routingModeLabel: formatRoutingModeLabel(domain.routingMode),
        statusLabel: formatEnumLabel(domain.status),
        isPrimary: domain.isPrimary,
        isVerified: domain.isVerified,
        verificationLabel: domain.isVerified ? 'Verified' : 'Pending',
        behavior: behavior.behavior,
        behaviorLabel: behavior.behaviorLabel,
        redirectTo: behavior.redirectTo,
        redirectStatusCode: behavior.redirectStatusCode,
        target: domain.target,
        targetLabel: domain.target ?? 'N/A',
        dnsHealthLabel: buildDnsHealthLabel(domain.dnsRecords),
        lastCheckedAtLabel: formatDate(domain.lastCheckedAt),
        verifiedAtLabel: formatDate(domain.verifiedAt),
        createdAtLabel: formatDate(domain.createdAt),
        lastVerificationError: domain.lastVerificationError,
        dnsRecords: domain.dnsRecords.map((record) => ({
          id: record.id,
          host: record.host,
          type: record.type,
          purposeLabel: formatEnumLabel(record.purpose),
          expectedValue: record.expectedValue,
          isRequired: record.isRequired,
          isMatched: record.isMatched,
          matchedValue: record.matchedValue,
          lastCheckedAtLabel: formatDate(record.lastCheckedAt),
          lastError: record.lastError,
        })),
      },
      providerLabel: getManagedWorkspaceDomainProviderLabel(),
    };
  });
}
