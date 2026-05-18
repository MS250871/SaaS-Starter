import { WorkspaceDomainType } from '@/generated/prisma/client';

import { withActionTxContext } from '@/lib/request/withActionContext';
import {
  getRootDomainHost,
  normalizeHostname,
} from '@/lib/middleware/proxy-utils';
import {
  countWorkspaceIdentityNotifications,
} from '@/modules/notifications/notification.services';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import { getManagedWorkspaceDomainProviderLabel } from '@/modules/workspace/services/domain-provider.services';
import { buildWorkspaceSignupPath } from '@/modules/workspace/routing';
import { workspaceApiKeyScopes } from '@/modules/workspace/api-key-scopes';
import { countWorkspaceCustomers } from '@/modules/customer/services/customer.services';
import { getWorkspaceActiveSubscriptionPlanSummary } from '@/modules/billing/services/subscription.services';
import {
  countPendingWorkspaceInvites,
  listPendingWorkspaceInvitesWithRoles,
} from '@/modules/workspace/services/invite.services';
import {
  countActiveWorkspaceApiKeys,
  listWorkspaceApiKeysDetailed,
} from '@/modules/workspace/services/apikey.services';
import {
  countActiveWorkspaceMemberships,
  listActiveWorkspaceMembersWithRoles,
} from '@/modules/workspace/services/membership.services';
import {
  countWorkspaceDomains,
  listWorkspaceDomainsDetailed,
} from '@/modules/workspace/services/domains.services';
import { listAssignableRoleDefinitions } from '@/modules/roles/role.services';
import { normalizeWorkspaceTheme } from '@/modules/workspace/theme';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';

type WorkspaceRedirectAliasConfig = {
  domain: string;
  redirectTo: string;
  redirectStatusCode: 301 | 302 | 307 | 308;
  verified: boolean;
};

type WorkspaceMemberWithRole = Awaited<
  ReturnType<typeof listActiveWorkspaceMembersWithRoles>
>[number];
type WorkspacePendingInvite = Awaited<
  ReturnType<typeof listPendingWorkspaceInvitesWithRoles>
>[number];
type WorkspaceDetailedApiKey = Awaited<
  ReturnType<typeof listWorkspaceApiKeysDetailed>
>[number];

function normalizeRedirectStatusCode(value: unknown): 301 | 302 | 307 | 308 {
  if (value === 301 || value === 302 || value === 307 || value === 308) {
    return value;
  }

  return 308;
}

function normalizeRedirectAliases(
  value: unknown,
): WorkspaceRedirectAliasConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const domain =
        typeof item.domain === 'string'
          ? normalizeHostname(item.domain)
          : null;
      const redirectTo =
        typeof item.redirectTo === 'string'
          ? normalizeHostname(item.redirectTo)
          : null;

      if (!domain || !redirectTo) {
        return null;
      }

      return {
        domain,
        redirectTo,
        redirectStatusCode: normalizeRedirectStatusCode(item.redirectStatusCode),
        verified: typeof item.verified === 'boolean' ? item.verified : false,
      } satisfies WorkspaceRedirectAliasConfig;
    })
    .filter((item): item is WorkspaceRedirectAliasConfig => Boolean(item));
}

function isCustomDomain(params: { domain: string; rootDomain: string | null }) {
  if (!params.rootDomain) {
    return true;
  }

  return !params.domain.endsWith(params.rootDomain);
}

function resolveWorkspaceDomainMode(params: {
  strategy?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  domainRows: Array<{ domain: string; isVerified: boolean }>;
  rootDomain?: string | null;
}) {
  if (params.customDomain && params.customDomainVerified) {
    return 'custom_domain' as const;
  }

  if (
    params.domainRows.some(
      (domain) =>
        domain.isVerified &&
        isCustomDomain({
          domain: domain.domain,
          rootDomain: params.rootDomain ?? null,
        }),
    )
  ) {
    return 'custom_domain' as const;
  }

  if (
    params.strategy === 'subdomain' ||
    params.strategy === 'sub_domain' ||
    params.strategy === 'subdomain_pending'
  ) {
    return 'subdomain' as const;
  }

  return 'free_path' as const;
}

export async function getWorkspaceOverviewPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        workspaceSummary: null,
      };
    }

    const [
      memberCount,
      pendingInviteCount,
      customerCount,
      domainCount,
      apiKeyCount,
      unreadNotificationCount,
    ] = await Promise.all([
      countActiveWorkspaceMemberships(context.workspaceId),
      countPendingWorkspaceInvites(context.workspaceId),
      countWorkspaceCustomers(context.workspaceId),
      countWorkspaceDomains(context.workspaceId),
      countActiveWorkspaceApiKeys(context.workspaceId),
      context.actor.identityId
        ? countWorkspaceIdentityNotifications({
            workspaceId: context.workspaceId,
            identityId: context.actor.identityId,
            unreadOnly: true,
          })
        : Promise.resolve(0),
    ]);

    return {
      ...context,
      workspaceSummary: {
        name: context.workspace.name,
        slug: context.workspace.slug,
        primaryDomain: context.workspace.defaultDomain,
        memberCount,
        pendingInviteCount,
        customerCount,
        domainCount,
        apiKeyCount,
        unreadNotificationCount,
      },
    };
  });
}

export async function getWorkspaceTeamPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        members: [],
        invites: [],
        assignableRoles: [],
      };
    }

    const [members, invites, assignableRoles] = await Promise.all([
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
      listPendingWorkspaceInvitesWithRoles(context.workspaceId, 20),
      listAssignableRoleDefinitions('WORKSPACE'),
    ]);

    return {
      ...context,
      members: members.map((member: WorkspaceMemberWithRole) => ({
        id: member.id,
        identityId: member.identityId,
        role: member.roleDefinition.name,
        roleKey: member.roleKey,
        roleDefinitionId: member.roleDefinition.id,
        roleSystemKey: member.roleSystemKey,
        roleRank: member.roleDefinition.hierarchyRank ?? null,
        createdAt: member.createdAt.toISOString(),
        name:
          `${member.identity.firstName ?? ''} ${
            member.identity.lastName ?? ''
          }`.trim() ||
          member.identity.email ||
          'Unnamed member',
        email: member.identity.email ?? null,
      })),
      invites: invites.map((invite: WorkspacePendingInvite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.roleKey,
        roleName: invite.roleDefinition.name,
        roleDefinitionId: invite.roleDefinition.id,
        roleSystemKey: invite.roleSystemKey,
        roleRank: invite.roleDefinition.hierarchyRank ?? null,
        status: invite.status,
        token: invite.token,
        signupPath: (() => {
          const signupPath = buildWorkspaceSignupPath({
            workspaceId: context.workspaceId,
            intent: 'free',
            strategy: context.strategy,
            slug: context.slug,
          });
          const url = new URL(signupPath, 'https://skillmaxx.local');
          url.searchParams.set('invite', invite.token);
          return `${url.pathname}?${url.searchParams.toString()}`;
        })(),
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        createdAt: invite.createdAt.toISOString(),
      })),
      assignableRoles: assignableRoles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description ?? null,
        roleSystemKey: role.systemKey ?? null,
        roleRank: role.hierarchyRank ?? null,
      })),
    };
  });
}

export async function getWorkspaceThemePageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    return {
      ...context,
      initialTheme: normalizeWorkspaceTheme(context.settings?.themes),
    };
  });
}

export async function getWorkspaceApiKeysPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId) {
      return {
        ...context,
        apiKeys: [],
        availableScopes: workspaceApiKeyScopes,
        apiKeySummary: {
          totalKeys: 0,
          activeKeys: 0,
          revokedKeys: 0,
          expiredKeys: 0,
        },
      };
    }

    const apiKeys = await listWorkspaceApiKeysDetailed(context.workspaceId);
    const now = new Date();

    return {
      ...context,
      apiKeys: apiKeys.map((apiKey: WorkspaceDetailedApiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix ?? null,
        description: apiKey.description ?? null,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        isExpired: Boolean(apiKey.expiresAt && apiKey.expiresAt < now),
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
        revokedAt: apiKey.revokedAt?.toISOString() ?? null,
        createdAt: apiKey.createdAt.toISOString(),
        createdByName:
          `${apiKey.createdBy?.firstName ?? ''} ${
            apiKey.createdBy?.lastName ?? ''
          }`.trim() ||
          apiKey.createdBy?.email ||
          'Workspace admin',
      })),
      availableScopes: workspaceApiKeyScopes,
      apiKeySummary: {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(
          (apiKey: WorkspaceDetailedApiKey) =>
            apiKey.isActive && (!apiKey.expiresAt || apiKey.expiresAt >= now),
        ).length,
        revokedKeys: apiKeys.filter(
          (apiKey: WorkspaceDetailedApiKey) => !apiKey.isActive,
        ).length,
        expiredKeys: apiKeys.filter((apiKey: WorkspaceDetailedApiKey) =>
          Boolean(apiKey.expiresAt && apiKey.expiresAt < now),
        ).length,
      },
    };
  });
}

export async function getWorkspaceDomainsPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        activePlan: null,
        domains: [],
        entitlements: {
          features: [] as string[],
          limits: {} as Record<string, number>,
        },
        domainConfig: {
          strategy: null as string | null,
          rootDomain: null as string | null,
          primaryHost: null as string | null,
          customDomain: null as string | null,
          customDomainVerified: false,
          redirectAliases: [] as WorkspaceRedirectAliasConfig[],
        },
        whiteLabelConfig: {
          isEnabled: false,
          customDomainSlots: 0,
          currentCustomDomainCount: 0,
          remainingCustomDomainSlots: 0,
          providerLabel: getManagedWorkspaceDomainProviderLabel(),
        },
        currentMode: 'free_path' as const,
      };
    }

    const domainSettings =
      (
        context.settings?.settings as {
          domain?: {
            strategy?: string | null;
            rootDomain?: string | null;
            primaryHost?: string | null;
            customDomain?: string | null;
            customDomainVerified?: boolean | null;
            redirectAliases?: unknown;
          };
        } | null
      )?.domain ?? null;

    const [domains, activeSubscription] = await Promise.all([
      listWorkspaceDomainsDetailed(context.workspaceId),
      getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
    ]);

    const activePlan = activeSubscription?.price?.product?.plan ?? null;
    const entitlements = await resolveEntitlements({
      workspaceId: context.workspaceId,
      planId: activePlan?.id,
    });
    const customDomainSlots = entitlements.limits.max_custom_domains ?? 0;
    const customDomainCount = domains.filter(
      (domain) =>
        domain.type === WorkspaceDomainType.CUSTOM && domain.isPrimary,
    ).length;
    const redirectAliases = normalizeRedirectAliases(
      domainSettings?.redirectAliases,
    );
    const redirectAliasMap = new Map<string, WorkspaceRedirectAliasConfig>(
      redirectAliases.map((alias) => [alias.domain, alias]),
    );
    const hasCustomDomainFeature =
      entitlements.features.includes('domain_custom') || customDomainSlots > 0;
    const currentMode = resolveWorkspaceDomainMode({
      strategy: domainSettings?.strategy ?? null,
      customDomain: domainSettings?.customDomain ?? null,
      customDomainVerified: domainSettings?.customDomainVerified ?? false,
      domainRows: domains,
      rootDomain: domainSettings?.rootDomain ?? getRootDomainHost(),
    });

    return {
      ...context,
      activePlan: activePlan
        ? {
            key: activePlan.key,
            name: activePlan.name,
            status: activeSubscription?.status ?? null,
            currentPeriodEnd:
              activeSubscription?.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      domains: domains.map((domain) => {
        const redirectAlias = redirectAliasMap.get(domain.domain);
        const behavior:
          | 'REDIRECT_ALIAS'
          | 'PRIMARY_ROUTE'
          | 'SECONDARY_ROUTE' = redirectAlias
          ? 'REDIRECT_ALIAS'
          : domain.isPrimary
            ? 'PRIMARY_ROUTE'
            : 'SECONDARY_ROUTE';

        return {
          id: domain.id,
          domain: domain.domain,
          type: domain.type,
          routingMode: domain.routingMode,
          status: domain.status,
          target: domain.target,
          isPrimary: domain.isPrimary,
          isVerified: domain.isVerified,
          behavior,
          redirectTo: redirectAlias?.redirectTo ?? null,
          redirectStatusCode: redirectAlias?.redirectStatusCode ?? null,
          createdAt: domain.createdAt.toISOString(),
          verifiedAt: domain.verifiedAt?.toISOString() ?? null,
          lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
          lastVerificationError: domain.lastVerificationError ?? null,
          dnsRecords: domain.dnsRecords.map((record) => ({
            id: record.id,
            type: record.type,
            purpose: record.purpose,
            host: record.host,
            expectedValue: record.expectedValue,
            isRequired: record.isRequired,
            isMatched: record.isMatched,
            matchedValue: record.matchedValue ?? null,
            lastCheckedAt: record.lastCheckedAt?.toISOString() ?? null,
            lastError: record.lastError ?? null,
          })),
        };
      }),
      entitlements,
      domainConfig: {
        strategy: domainSettings?.strategy ?? null,
        rootDomain: domainSettings?.rootDomain ?? getRootDomainHost(),
        primaryHost:
          domainSettings?.primaryHost ??
          context.workspace.defaultDomain ??
          getRootDomainHost(),
        customDomain: domainSettings?.customDomain ?? null,
        customDomainVerified: domainSettings?.customDomainVerified ?? false,
        redirectAliases,
      },
      whiteLabelConfig: {
        isEnabled: hasCustomDomainFeature,
        customDomainSlots,
        currentCustomDomainCount: customDomainCount,
        remainingCustomDomainSlots:
          customDomainSlots > 0
            ? Math.max(customDomainSlots - customDomainCount, 0)
            : 0,
        providerLabel: getManagedWorkspaceDomainProviderLabel(),
      },
      currentMode,
    };
  });
}
