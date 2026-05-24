import {
  Prisma,
  WorkspaceDomainRoutingMode,
  WorkspaceDomainStatus,
  WorkspaceDomainType,
} from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { getWorkspaceRootDomain } from '@/modules/workspace/defaults';
import {
  buildManagedWorkspaceSubdomain,
  type WorkspaceDomainStrategy,
} from '@/modules/workspace/routing';
import {
  createWorkspaceDomain,
  getWorkspaceDomainEntitlements,
  listWorkspaceDomains,
  updateWorkspaceDomain,
} from '@/modules/workspace/services/domains.services';
import {
  buildWorkspaceRoutingCachePayload,
  cacheWorkspaceDomain,
  cacheWorkspaceSlug,
  clearWorkspaceDomainCache,
  clearWorkspaceSlugCache,
} from '@/modules/workspace/services/routing-cache.services';
import {
  getWorkspaceSettings,
  updateWorkspaceConfig,
} from '@/modules/workspace/services/setting.services';
import {
  getWorkspaceById,
  updateWorkspace,
} from '@/modules/workspace/services/workspace.services';

type WorkspaceSettingsJson = {
  domain?: {
    strategy?: string | null;
    slug?: string | null;
    rootDomain?: string | null;
    primaryHost?: string | null;
    customDomain?: string | null;
    customDomainVerified?: boolean | null;
    redirectAliases?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WorkspaceRoutingSnapshot = {
  workspaceId: string;
  slug: string;
  strategy: WorkspaceDomainStrategy;
  rootDomain: string;
  primaryHost: string;
  managedSubdomainHost: string;
  customDomain: string | null;
  intent: 'free' | 'paid';
};

type WorkspaceRoutingCachePlan = {
  slug: string;
  cachePayload: ReturnType<typeof buildWorkspaceRoutingCachePayload>;
  domainsToClear: string[];
  domainsToCache: string[];
};

function hasSubdomainEntitlement(entitlements: {
  features: string[];
  limits: Record<string, number>;
}) {
  return (
    entitlements.features.includes('domain_subdomain') ||
    entitlements.features.includes('domain_custom') ||
    (entitlements.limits.max_subdomains ?? 0) > 0
  );
}

function hasCustomDomainEntitlement(entitlements: {
  features: string[];
  limits: Record<string, number>;
}) {
  return (
    entitlements.features.includes('domain_custom') ||
    (entitlements.limits.max_custom_domains ?? 0) > 0
  );
}

function toWorkspaceIntent(activePlanKey?: string | null): 'free' | 'paid' {
  return activePlanKey && activePlanKey !== 'trial' ? 'paid' : 'free';
}

export async function syncWorkspaceRoutingState(
  workspaceId: string,
): Promise<WorkspaceRoutingSnapshot> {
  const { snapshot, cachePlan } = await withUnitOfWork(async () => {
    if (!workspaceId) {
      throwError(ERR.INVALID_INPUT, 'workspaceId is required');
    }

    const [workspace, settingsRecord, domainEntitlements, currentDomains] =
      await Promise.all([
        getWorkspaceById(workspaceId),
        getWorkspaceSettings(workspaceId),
        getWorkspaceDomainEntitlements(workspaceId),
        listWorkspaceDomains(workspaceId),
      ]);

    const currentSettings =
      settingsRecord?.settings && typeof settingsRecord.settings === 'object'
        ? (settingsRecord.settings as unknown as WorkspaceSettingsJson)
        : {};
    const currentDomainSettings = currentSettings.domain ?? {};
    const rootDomain =
      typeof currentDomainSettings.rootDomain === 'string' &&
      currentDomainSettings.rootDomain
        ? currentDomainSettings.rootDomain
        : getWorkspaceRootDomain();
    const managedSubdomainHost = buildManagedWorkspaceSubdomain(
      workspace.slug,
      rootDomain,
    );
    const canUseCustom = hasCustomDomainEntitlement(
      domainEntitlements.entitlements,
    );
    const canUseSubdomain =
      hasSubdomainEntitlement(domainEntitlements.entitlements) || canUseCustom;
    const originalDomainValues = new Set(
      currentDomains.map((domain) => domain.domain.toLowerCase()),
    );

    let managedSubdomain =
      currentDomains.find(
        (domain) =>
          domain.type === WorkspaceDomainType.SUBDOMAIN &&
          domain.domain === managedSubdomainHost,
      ) ?? null;

    if (canUseSubdomain) {
      if (!managedSubdomain) {
        managedSubdomain = await createWorkspaceDomain({
          workspaceId,
          domain: managedSubdomainHost,
          type: WorkspaceDomainType.SUBDOMAIN,
          routingMode: WorkspaceDomainRoutingMode.CNAME,
          status: WorkspaceDomainStatus.VERIFIED,
          target: rootDomain,
          verificationToken: null,
          isPrimary: false,
          isVerified: true,
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
          lastVerificationError: null,
        });
      }
    }

    for (const domain of currentDomains.filter(
      (entry) => entry.type === WorkspaceDomainType.SUBDOMAIN,
    )) {
      const shouldBeManaged =
        domain.domain === managedSubdomainHost && canUseSubdomain;

      if (shouldBeManaged) {
        await updateWorkspaceDomain(domain.id, {
          routingMode: WorkspaceDomainRoutingMode.CNAME,
          status: WorkspaceDomainStatus.VERIFIED,
          target: rootDomain,
          isVerified: true,
          verifiedAt: domain.verifiedAt ?? new Date(),
          lastCheckedAt: new Date(),
          lastVerificationError: null,
        });
        continue;
      }

      await updateWorkspaceDomain(domain.id, {
        status: WorkspaceDomainStatus.DISABLED,
        isPrimary: false,
        lastVerificationError: null,
      });
    }

    const domainsAfterManagedSync = await listWorkspaceDomains(workspaceId);
    const customDomains = domainsAfterManagedSync.filter(
      (domain) => domain.type === WorkspaceDomainType.CUSTOM,
    );
    const preferredVerifiedCustom =
      customDomains.find((domain) => domain.isPrimary && domain.isVerified) ??
      customDomains.find((domain) => domain.isVerified) ??
      null;

    const desiredStrategy: WorkspaceDomainStrategy =
      canUseCustom && preferredVerifiedCustom
        ? 'custom_domain'
        : canUseSubdomain
          ? 'subdomain'
          : 'free_path';

    for (const domain of customDomains) {
      if (!canUseCustom) {
        await updateWorkspaceDomain(domain.id, {
          status: WorkspaceDomainStatus.DISABLED,
          isPrimary: false,
        });
        continue;
      }

      const nextStatus = domain.isVerified
        ? WorkspaceDomainStatus.VERIFIED
        : domain.status === WorkspaceDomainStatus.FAILED
          ? WorkspaceDomainStatus.FAILED
          : WorkspaceDomainStatus.PENDING_VERIFICATION;

      await updateWorkspaceDomain(domain.id, {
        status: nextStatus,
        isPrimary:
          desiredStrategy === 'custom_domain' &&
          preferredVerifiedCustom?.id === domain.id,
      });
    }

    if (managedSubdomain && canUseSubdomain) {
      await updateWorkspaceDomain(managedSubdomain.id, {
        isPrimary: desiredStrategy === 'subdomain',
        status: WorkspaceDomainStatus.VERIFIED,
        target: rootDomain,
        isVerified: true,
        verifiedAt: managedSubdomain.verifiedAt ?? new Date(),
        lastCheckedAt: new Date(),
        lastVerificationError: null,
      });
    }

    const finalDomains = await listWorkspaceDomains(workspaceId);
    const finalPrimaryCustomDomain =
      finalDomains.find(
        (domain) =>
          domain.type === WorkspaceDomainType.CUSTOM &&
          domain.isPrimary &&
          domain.isVerified &&
          domain.status === WorkspaceDomainStatus.VERIFIED,
      ) ?? null;
    const finalManagedSubdomain =
      finalDomains.find(
        (domain) =>
          domain.type === WorkspaceDomainType.SUBDOMAIN &&
          domain.domain === managedSubdomainHost &&
          domain.isVerified &&
          domain.status === WorkspaceDomainStatus.VERIFIED,
      ) ?? null;
    const finalStrategy: WorkspaceDomainStrategy = finalPrimaryCustomDomain
      ? 'custom_domain'
      : finalManagedSubdomain
        ? 'subdomain'
        : 'free_path';
    const primaryHost =
      finalStrategy === 'custom_domain'
        ? finalPrimaryCustomDomain!.domain
        : finalStrategy === 'subdomain'
          ? managedSubdomainHost
          : rootDomain;
    const retainedCustomDomain = canUseCustom
      ? preferredVerifiedCustom?.domain ??
        customDomains.find((domain) => domain.isPrimary)?.domain ??
        null
      : null;
    const nextSettings: WorkspaceSettingsJson = {
      ...currentSettings,
      domain: {
        ...currentDomainSettings,
        strategy: finalStrategy,
        slug: workspace.slug,
        rootDomain,
        primaryHost,
        customDomain: retainedCustomDomain,
        customDomainVerified: Boolean(finalPrimaryCustomDomain),
        redirectAliases: canUseCustom
          ? currentDomainSettings.redirectAliases ?? []
          : [],
      },
    };

    await Promise.all([
      updateWorkspaceConfig(
        workspaceId,
        nextSettings as unknown as Prisma.InputJsonValue,
      ),
      updateWorkspace(workspaceId, {
        defaultDomain: primaryHost,
      }),
    ]);

    const cachePayload = buildWorkspaceRoutingCachePayload({
      workspaceId: workspace.id,
      slug: workspace.slug,
      isActive: workspace.isActive,
      primaryDomain: primaryHost,
      strategy: finalStrategy,
    });

    const finalDomainValues = new Set(
      finalDomains.map((domain) => domain.domain.toLowerCase()),
    );

    return {
      snapshot: {
        workspaceId: workspace.id,
        slug: workspace.slug,
        strategy: finalStrategy,
        rootDomain,
        primaryHost,
        managedSubdomainHost,
        customDomain: retainedCustomDomain,
        intent: toWorkspaceIntent(domainEntitlements.activePlan?.key),
      } satisfies WorkspaceRoutingSnapshot,
      cachePlan: {
        slug: workspace.slug,
        cachePayload,
        domainsToClear: Array.from(
          new Set([...originalDomainValues, ...finalDomainValues]),
        ),
        domainsToCache: finalDomains
          .filter(
            (domain) =>
              domain.status === WorkspaceDomainStatus.VERIFIED ||
              domain.status === WorkspaceDomainStatus.DISABLED,
          )
          .map((domain) => domain.domain),
      } satisfies WorkspaceRoutingCachePlan,
    };
  });

  await clearWorkspaceSlugCache(cachePlan.slug);
  await cacheWorkspaceSlug(cachePlan.slug, cachePlan.cachePayload);

  for (const domain of cachePlan.domainsToClear) {
    await clearWorkspaceDomainCache(domain);
  }

  for (const domain of cachePlan.domainsToCache) {
    await cacheWorkspaceDomain(domain, cachePlan.cachePayload);
  }

  return snapshot;
}
