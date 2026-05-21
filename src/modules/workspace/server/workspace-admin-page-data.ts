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
import { listWorkspaceCustomers } from '@/modules/customer/services/customer.services';
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
  type WorkspaceDomainDetailed,
} from '@/modules/workspace/services/domains.services';
import { listAssignableRoleDefinitions } from '@/modules/roles/role.services';
import { normalizeWorkspaceTheme } from '@/modules/workspace/theme';
import { getWorkspaceAdminSurfaceContext } from '@/modules/workspace/server/admin-surface-context';
import { getWorkspaceSupportSummary } from '@/modules/support/support.services';

export type WorkspaceOverviewMetrics = {
  hero: {
    workspaceName: string;
    slug: string;
    planName: string;
    planStatus: string;
    primaryDomain: string;
    dataSourceLabel: string;
    memberCount: number;
    customerCount: number;
    domainCount: number;
    apiKeyCount: number;
    pendingInviteCount: number;
    unreadNotificationCount: number;
    verifiedCustomDomainCount: number;
    redirectAliasCount: number;
    openWorkspaceTickets: number;
    openPlatformEscalations: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    activeLearners: number;
    completionRate: number;
  };
  cards: Array<{
    title: string;
    value: string;
    trend: string;
    detail: string;
  }>;
  commerceSeries: Array<{
    month: string;
    revenue: number;
    refunds: number;
    revenueLakh: number;
    refundsLakh: number;
  }>;
  learnerSeries: Array<{
    month: string;
    activeLearners: number;
    enrollments: number;
    completions: number;
  }>;
  catalogMix: Array<{
    key: 'certification' | 'cohort' | 'microCourse' | 'coaching';
    label: string;
    value: number;
    fill: string;
  }>;
  queueHealth: Array<{
    key:
      | 'openWorkspaceTickets'
      | 'openPlatformEscalations'
      | 'unreadNotifications'
      | 'pendingInvites';
    label: string;
    value: number;
    fill: string;
  }>;
};

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

type MonthBucket = {
  key: string;
  label: string;
};

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildRecentMonthBuckets(count: number) {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: toMonthKey(monthDate),
      label: monthDate.toLocaleString('en-IN', { month: 'short' }),
    });
  }

  return buckets;
}

function safeDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export async function getWorkspaceOverviewPageData() {
  return withActionTxContext(async () => {
    const context = await getWorkspaceAdminSurfaceContext();

    if (!context.workspaceId || !context.workspace) {
      return {
        ...context,
        workspaceSummary: null,
        workspaceOverview: null,
      };
    }

    const [
      memberCount,
      pendingInviteCount,
      customerCount,
      domainCount,
      apiKeyCount,
      unreadNotificationCount,
      members,
      customersPage,
      domains,
      activeSubscription,
      supportSummary,
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
      listActiveWorkspaceMembersWithRoles(context.workspaceId),
      listWorkspaceCustomers(context.workspaceId, {
        page: 1,
        pageSize: 500,
      }),
      listWorkspaceDomainsDetailed(context.workspaceId),
      getWorkspaceActiveSubscriptionPlanSummary(context.workspaceId),
      getWorkspaceSupportSummary(context.workspaceId),
    ]);

    const domainSettings =
      (
        context.settings?.settings as {
          domain?: {
            strategy?: string | null;
            rootDomain?: string | null;
            primaryHost?: string | null;
            customDomain?: string | null;
            customDomainVerified?: boolean | null;
          };
        } | null
      )?.domain ?? null;

    const verifiedCustomDomainCount = domains.filter(
      (domain: WorkspaceDomainDetailed) =>
        domain.type === WorkspaceDomainType.CUSTOM &&
        domain.isPrimary &&
        domain.isVerified,
    ).length;
    const redirectAliasCount = domains.filter(
      (domain: WorkspaceDomainDetailed) =>
        domain.type === WorkspaceDomainType.CUSTOM && !domain.isPrimary,
    ).length;

    const recentBuckets = buildRecentMonthBuckets(6);
    const planName = activeSubscription?.price?.product?.plan?.name ?? 'Free';
    const planStatus =
      activeSubscription?.status
        ?.toLowerCase()
        .replace(/_/g, ' ') ?? 'No paid subscription';

    const queueHealth: WorkspaceOverviewMetrics['queueHealth'] = [
      {
        key: 'openWorkspaceTickets',
        label: 'Workspace support',
        value: supportSummary.openWorkspaceTickets,
        fill: 'var(--color-openWorkspaceTickets)',
      },
      {
        key: 'openPlatformEscalations',
        label: 'Platform escalations',
        value: supportSummary.openPlatformEscalations,
        fill: 'var(--color-openPlatformEscalations)',
      },
      {
        key: 'unreadNotifications',
        label: 'Unread notifications',
        value: unreadNotificationCount,
        fill: 'var(--color-unreadNotifications)',
      },
      {
        key: 'pendingInvites',
        label: 'Pending invites',
        value: pendingInviteCount,
        fill: 'var(--color-pendingInvites)',
      },
    ];

    const workspaceScale = Math.max(customerCount, memberCount * 12, 180);
    const recentMemberAdds = members.filter((member) => {
      const createdAt = safeDate(member.createdAt);
      if (!createdAt) return false;
      return createdAt >= new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    }).length;
    const recentCustomerAdds = customersPage.items.filter((customer) => {
      const createdAt = safeDate(customer.createdAt);
      if (!createdAt) return false;
      return createdAt >= new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    }).length;
    const seriesSeed =
      memberCount * 17 +
      customerCount * 11 +
      pendingInviteCount * 7 +
      apiKeyCount * 5 +
      domainCount * 3;

    const commerceSeries = recentBuckets.map((bucket, index) => {
      const periodWeight = index + 1;
      const enrollments =
        Math.round(workspaceScale * (0.16 + periodWeight * 0.012)) +
        recentCustomerAdds * 3 +
        (seriesSeed % 19);
      const revenue =
        enrollments * (2600 + periodWeight * 140) + memberCount * 3200;
      const refunds = Math.round(revenue * (0.028 + (index % 3) * 0.004));

      return {
        month: bucket.label,
        revenue,
        refunds,
        revenueLakh: Number((revenue / 100000).toFixed(2)),
        refundsLakh: Number((refunds / 100000).toFixed(2)),
      };
    });

    const learnerSeries = recentBuckets.map((bucket, index) => {
      const periodWeight = index + 1;
      const activeLearners =
        Math.round(workspaceScale * (0.58 + periodWeight * 0.028)) +
        recentCustomerAdds * 4;
      const enrollments =
        Math.round(workspaceScale * (0.18 + periodWeight * 0.015)) +
        recentMemberAdds * 5 +
        (seriesSeed % 13);
      const completions = Math.round(enrollments * (0.62 + periodWeight * 0.018));

      return {
        month: bucket.label,
        activeLearners,
        enrollments,
        completions,
      };
    });

    const latestCommerce =
      commerceSeries[commerceSeries.length - 1] ??
      ({
        revenue: 0,
        refunds: 0,
      } as const);
    const previousCommerce =
      commerceSeries[commerceSeries.length - 2] ??
      ({
        revenue: 0,
        refunds: 0,
      } as const);
    const latestLearnerSeries =
      learnerSeries[learnerSeries.length - 1] ??
      ({
        activeLearners: 0,
        enrollments: 0,
        completions: 0,
      } as const);
    const totalRevenue = commerceSeries.reduce(
      (sum, bucket) => sum + bucket.revenue,
      0,
    );
    const completionRate =
      latestLearnerSeries.enrollments > 0
        ? Math.round(
            (latestLearnerSeries.completions /
              latestLearnerSeries.enrollments) *
              100,
          )
        : 0;
    const monthlyRevenueDelta =
      latestCommerce.revenue - previousCommerce.revenue;
    const activeLearnerDelta =
      latestLearnerSeries.activeLearners -
      (learnerSeries[learnerSeries.length - 2]?.activeLearners ?? 0);
    const catalogMix: WorkspaceOverviewMetrics['catalogMix'] = [
      {
        key: 'certification',
        label: 'Certification bootcamps',
        value: Math.max(3, Math.round(memberCount * 0.8) + 6),
        fill: 'var(--color-certification)',
      },
      {
        key: 'cohort',
        label: 'Live cohorts',
        value: Math.max(2, Math.round(memberCount * 0.5) + 4),
        fill: 'var(--color-cohort)',
      },
      {
        key: 'microCourse',
        label: 'Micro-courses',
        value: Math.max(6, Math.round(customerCount * 0.04) + 8),
        fill: 'var(--color-microCourse)',
      },
      {
        key: 'coaching',
        label: 'Coaching programs',
        value: Math.max(1, Math.round(memberCount * 0.35) + 2),
        fill: 'var(--color-coaching)',
      },
    ];

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
      workspaceOverview: {
        hero: {
          workspaceName: context.workspace.name,
          slug: context.workspace.slug,
          planName,
          planStatus:
            planStatus.charAt(0).toUpperCase() + planStatus.slice(1),
          primaryDomain:
            domainSettings?.primaryHost ??
            context.workspace.defaultDomain ??
            getRootDomainHost() ??
            'No primary host',
          dataSourceLabel:
            'Sample LMS commerce data derived from workspace footprint',
          memberCount,
          customerCount,
          domainCount,
          apiKeyCount,
          pendingInviteCount,
          unreadNotificationCount,
          verifiedCustomDomainCount,
          redirectAliasCount,
          openWorkspaceTickets: supportSummary.openWorkspaceTickets,
          openPlatformEscalations: supportSummary.openPlatformEscalations,
          totalRevenue,
          monthlyRecurringRevenue: latestCommerce.revenue,
          activeLearners: latestLearnerSeries.activeLearners,
          completionRate,
        },
        cards: [
          {
            title: 'Monthly learner revenue',
            value: formatCurrency(latestCommerce.revenue),
            trend:
              monthlyRevenueDelta >= 0
                ? `+${formatCompact(monthlyRevenueDelta)} vs last month`
                : `${formatCompact(monthlyRevenueDelta)} vs last month`,
            detail: `${formatCurrency(latestCommerce.refunds)} in projected refunds for the same period`,
          },
          {
            title: 'Active learners',
            value: latestLearnerSeries.activeLearners.toLocaleString('en-IN'),
            trend:
              activeLearnerDelta >= 0
                ? `+${activeLearnerDelta.toLocaleString('en-IN')} vs last month`
                : `${activeLearnerDelta.toLocaleString('en-IN')} vs last month`,
            detail: `${latestLearnerSeries.enrollments.toLocaleString('en-IN')} new enrollments are forecast this month`,
          },
          {
            title: 'Completion rate',
            value: `${completionRate}%`,
            trend: `${latestLearnerSeries.completions.toLocaleString('en-IN')} projected completions`,
            detail: `${memberCount.toLocaleString('en-IN')} instructors and operators supporting learner delivery`,
          },
          {
            title: 'Attention Queue',
            value: (
              supportSummary.openWorkspaceTickets +
              supportSummary.openPlatformEscalations +
              unreadNotificationCount +
              pendingInviteCount
            ).toLocaleString('en-IN'),
            trend: `${supportSummary.openWorkspaceTickets} open workspace tickets`,
            detail: `${supportSummary.openPlatformEscalations} platform escalations - ${unreadNotificationCount} unread notifications`,
          },
        ],
        commerceSeries,
        learnerSeries,
        catalogMix,
        queueHealth,
      } satisfies WorkspaceOverviewMetrics,
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
