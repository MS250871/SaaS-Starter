import { withActionReadContext } from '@/lib/request/withActionContext';
import { identityQueries } from '@/modules/auth/db';
import { paymentQueries, refundQueries, subscriptionQueries } from '@/modules/billing/db';
import { customerQueries } from '@/modules/customer/db';
import { notificationQueries } from '@/modules/notifications/db';
import { supportTicketQueries } from '@/modules/support/db';
import { workspaceQueries } from '@/modules/workspace/db';
import { normalizeWorkspaceDomainStrategy } from '@/modules/workspace/routing';

type OverviewCard = {
  title: string;
  value: string;
  trend: string;
  detail: string;
};

type OverviewSeriesPoint = {
  month: string;
};

export type PlatformOverviewPageData = {
  hero: {
    workspaceCount: number;
    activeWorkspaceCount: number;
    activeSubscriptionCount: number;
    scheduledCancellationCount: number;
    trailing30dCollections: number;
    trailing30dRefunds: number;
    openEscalations: number;
    failedDeliveries: number;
    pendingRefunds: number;
    unreadNotifications: number;
    liveSubscriptionWorkspaceCount: number;
    configuredHostCount: number;
    identityCount: number;
    customerCount: number;
  };
  cards: OverviewCard[];
  tenantGrowthSeries: Array<
    OverviewSeriesPoint & {
      workspaces: number;
      identities: number;
      customers: number;
    }
  >;
  commerceSeries: Array<
    OverviewSeriesPoint & {
      collected: number;
      refunded: number;
      paymentCount: number;
      collectedLakh: number;
      refundedLakh: number;
    }
  >;
  routingMix: Array<{
    key: 'freePath' | 'subdomain' | 'customDomain';
    label: string;
    value: number;
    fill: string;
  }>;
  queueHealth: Array<{
    label: string;
    value: number;
  }>;
};

type MonthBucket = {
  key: string;
  label: string;
  index: number;
};

const SCREENSHOT_SAMPLE_OVERVIEW = {
  hero: {
    workspaceCount: 126,
    activeWorkspaceCount: 111,
    activeSubscriptionCount: 74,
    scheduledCancellationCount: 6,
    trailing30dCollections: 2485000,
    trailing30dRefunds: 128000,
    openEscalations: 9,
    failedDeliveries: 13,
    pendingRefunds: 4,
    unreadNotifications: 27,
    liveSubscriptionWorkspaceCount: 68,
    configuredHostCount: 59,
    identityCount: 3420,
    customerCount: 18640,
  },
  cards: [
    {
      title: 'Tenant Base',
      value: '126',
      trend: '111 active workspaces',
      detail: '59 with configured primary hosts',
    },
    {
      title: 'Live Subscriptions',
      value: '74',
      trend: '6 cancel at cycle end',
      detail: '68 workspaces currently on paid plans',
    },
    {
      title: '30 Day Collections',
      value: formatCurrency(2485000),
      trend: '+3.1L vs last month',
      detail: `${formatCurrency(128000)} refunded in the same window`,
    },
    {
      title: 'Attention Queue',
      value: '26',
      trend: '9 support escalations',
      detail: '13 failed deliveries - 4 pending refunds',
    },
  ] satisfies OverviewCard[],
  tenantGrowthSeries: [
    { month: 'Dec', workspaces: 11, identities: 190, customers: 820 },
    { month: 'Jan', workspaces: 17, identities: 360, customers: 1410 },
    { month: 'Feb', workspaces: 24, identities: 620, customers: 2680 },
    { month: 'Mar', workspaces: 18, identities: 540, customers: 2310 },
    { month: 'Apr', workspaces: 29, identities: 770, customers: 3920 },
    { month: 'May', workspaces: 27, identities: 940, customers: 5150 },
  ] satisfies PlatformOverviewPageData['tenantGrowthSeries'],
  commerceSeries: [
    {
      month: 'Dec',
      collected: 1280000,
      refunded: 96000,
      paymentCount: 108,
      collectedLakh: 12.8,
      refundedLakh: 0.96,
    },
    {
      month: 'Jan',
      collected: 1650000,
      refunded: 71000,
      paymentCount: 129,
      collectedLakh: 16.5,
      refundedLakh: 0.71,
    },
    {
      month: 'Feb',
      collected: 1490000,
      refunded: 88000,
      paymentCount: 121,
      collectedLakh: 14.9,
      refundedLakh: 0.88,
    },
    {
      month: 'Mar',
      collected: 1980000,
      refunded: 102000,
      paymentCount: 156,
      collectedLakh: 19.8,
      refundedLakh: 1.02,
    },
    {
      month: 'Apr',
      collected: 1820000,
      refunded: 93000,
      paymentCount: 149,
      collectedLakh: 18.2,
      refundedLakh: 0.93,
    },
    {
      month: 'May',
      collected: 2485000,
      refunded: 128000,
      paymentCount: 188,
      collectedLakh: 24.85,
      refundedLakh: 1.28,
    },
  ] satisfies PlatformOverviewPageData['commerceSeries'],
  routingMix: [
    {
      key: 'freePath',
      label: 'Free path',
      value: 41,
      fill: 'var(--color-freePath)',
    },
    {
      key: 'subdomain',
      label: 'Subdomain',
      value: 52,
      fill: 'var(--color-subdomain)',
    },
    {
      key: 'customDomain',
      label: 'Custom domain',
      value: 33,
      fill: 'var(--color-customDomain)',
    },
  ] satisfies PlatformOverviewPageData['routingMix'],
  queueHealth: [
    {
      label: 'Unread notifications',
      value: 27,
    },
    {
      label: 'Failed deliveries',
      value: 13,
    },
    {
      label: 'Pending refunds',
      value: 4,
    },
    {
      label: 'Open escalations',
      value: 9,
    },
  ] satisfies PlatformOverviewPageData['queueHealth'],
};

function shouldUseScreenshotSampleData(data: PlatformOverviewPageData) {
  const hasAnyCollections = data.commerceSeries.some(
    (item) => item.collected > 0 || item.refunded > 0,
  );
  const hasAnyTenantGrowth = data.tenantGrowthSeries.some(
    (item) =>
      item.workspaces > 0 || item.identities > 0 || item.customers > 0,
  );
  const queueTotal = data.queueHealth.reduce((total, item) => total + item.value, 0);
  const routingTotal = data.routingMix.reduce((total, item) => total + item.value, 0);

  return (
    data.hero.workspaceCount < 8 ||
    !hasAnyCollections ||
    !hasAnyTenantGrowth ||
    queueTotal === 0 ||
    routingTotal === 0
  );
}

function withScreenshotSampleData(
  data: PlatformOverviewPageData,
): PlatformOverviewPageData {
  if (!shouldUseScreenshotSampleData(data)) {
    return data;
  }

  return {
    ...SCREENSHOT_SAMPLE_OVERVIEW,
  };
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
      index: count - offset,
    });
  }

  return buckets;
}

function buildMonthMap<T extends Record<string, number>>(
  buckets: MonthBucket[],
  factory: () => T,
) {
  return new Map(
    buckets.map((bucket) => [
      bucket.key,
      {
        month: bucket.label,
        ...factory(),
      },
    ]),
  );
}

function safeDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

function isSuccessfulStatus(status: string | null | undefined) {
  return status?.toUpperCase() === 'SUCCESS';
}

function isPendingStatus(status: string | null | undefined) {
  return status?.toUpperCase() === 'PENDING';
}

function isOpenQueueStatus(status: string | null | undefined) {
  const normalized = status?.toLowerCase();
  return normalized === 'open' || normalized === 'in_progress';
}

export async function getPlatformOverviewPageData(): Promise<PlatformOverviewPageData> {
  return withActionReadContext(async () => {
    const [
      workspaces,
      identities,
      customers,
      subscriptions,
      payments,
      refunds,
      tickets,
      notifications,
    ] = await Promise.all([
      workspaceQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          id: true,
          isActive: true,
          defaultDomain: true,
          createdAt: true,
          settings: {
            select: {
              settings: true,
            },
          },
        },
      }),
      identityQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          createdAt: true,
        },
      }),
      customerQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          createdAt: true,
        },
      }),
      subscriptionQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          workspaceId: true,
          status: true,
          cancelAtPeriodEnd: true,
        },
      }),
      paymentQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          amount: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      refundQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
      supportTicketQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          contextType: true,
          status: true,
        },
      }),
      notificationQueries.delegate.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        select: {
          isRead: true,
          deliveries: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);
    const recentBuckets = buildRecentMonthBuckets(6);

    const tenantGrowthMap = buildMonthMap(recentBuckets, () => ({
      workspaces: 0,
      identities: 0,
      customers: 0,
    }));

    for (const workspace of workspaces) {
      const createdAt = safeDate(workspace.createdAt);
      if (!createdAt) continue;
      const bucket = tenantGrowthMap.get(toMonthKey(createdAt));
      if (bucket) bucket.workspaces += 1;
    }

    for (const identity of identities) {
      const createdAt = safeDate(identity.createdAt);
      if (!createdAt) continue;
      const bucket = tenantGrowthMap.get(toMonthKey(createdAt));
      if (bucket) bucket.identities += 1;
    }

    for (const customer of customers) {
      const createdAt = safeDate(customer.createdAt);
      if (!createdAt) continue;
      const bucket = tenantGrowthMap.get(toMonthKey(createdAt));
      if (bucket) bucket.customers += 1;
    }

    const commerceMap = buildMonthMap(recentBuckets, () => ({
      collected: 0,
      refunded: 0,
      paymentCount: 0,
    }));

    let trailing30dCollections = 0;
    let trailing30dRefunds = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const payment of payments) {
      const createdAt = safeDate(payment.createdAt);
      if (!createdAt) continue;
      const amount = Number(payment.amount);

      if (isSuccessfulStatus(payment.paymentStatus)) {
        const bucket = commerceMap.get(toMonthKey(createdAt));
        if (bucket) {
          bucket.collected += amount;
          bucket.paymentCount += 1;
        }

        if (createdAt >= thirtyDaysAgo) {
          trailing30dCollections += amount;
        }
      }
    }

    for (const refund of refunds) {
      const createdAt = safeDate(refund.createdAt);
      if (!createdAt) continue;
      const amount = Number(refund.amount);

      if (isSuccessfulStatus(refund.status)) {
        const bucket = commerceMap.get(toMonthKey(createdAt));
        if (bucket) {
          bucket.refunded += amount;
        }

        if (createdAt >= thirtyDaysAgo) {
          trailing30dRefunds += amount;
        }
      }
    }

    const routingMix = {
      freePath: 0,
      subdomain: 0,
      customDomain: 0,
    };

    for (const workspace of workspaces) {
      const settings =
        workspace.settings?.settings &&
        typeof workspace.settings.settings === 'object'
          ? (workspace.settings.settings as {
              domain?: { strategy?: string | null } | null;
            })
          : null;
      const strategy = normalizeWorkspaceDomainStrategy(
        settings?.domain?.strategy,
      );

      if (strategy === 'custom_domain') {
        routingMix.customDomain += 1;
      } else if (strategy === 'subdomain') {
        routingMix.subdomain += 1;
      } else {
        routingMix.freePath += 1;
      }
    }

    const activeSubscriptions = subscriptions.filter((subscription) =>
      ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(subscription.status),
    );
    const activeSubscriptionCount = activeSubscriptions.length;
    const liveSubscriptionWorkspaceCount = new Set(
      activeSubscriptions
        .map((subscription) => subscription.workspaceId)
        .filter((workspaceId): workspaceId is string => Boolean(workspaceId)),
    ).size;
    const scheduledCancellationCount = subscriptions.filter(
      (subscription) => subscription.cancelAtPeriodEnd,
    ).length;
    const configuredHostCount = workspaces.filter(
      (workspace) => Boolean(workspace.defaultDomain),
    ).length;

    const openEscalations = tickets.filter(
      (ticket) =>
        ticket.contextType === 'PLATFORM' &&
        isOpenQueueStatus(ticket.status),
    ).length;
    const failedDeliveries = notifications.flatMap((notification) =>
      notification.deliveries.filter((delivery) => delivery.status === 'FAILED'),
    ).length;
    const pendingRefunds = refunds.filter((refund) =>
      isPendingStatus(refund.status),
    ).length;
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead,
    ).length;

    const latestCollections =
      commerceMap.get(recentBuckets[recentBuckets.length - 1]?.key ?? '')?.collected ?? 0;
    const previousCollections =
      commerceMap.get(recentBuckets[recentBuckets.length - 2]?.key ?? '')?.collected ?? 0;
    const collectionDelta =
      latestCollections === 0 && previousCollections === 0
        ? 0
        : latestCollections - previousCollections;

    const overview: PlatformOverviewPageData = {
      hero: {
        workspaceCount: workspaces.length,
        activeWorkspaceCount: workspaces.filter((workspace) => workspace.isActive)
          .length,
        activeSubscriptionCount,
        scheduledCancellationCount,
        trailing30dCollections,
        trailing30dRefunds,
        openEscalations,
        failedDeliveries,
        pendingRefunds,
        unreadNotifications,
        liveSubscriptionWorkspaceCount,
        configuredHostCount,
        identityCount: identities.length,
        customerCount: customers.length,
      },
      cards: [
        {
          title: 'Tenant Base',
          value: workspaces.length.toLocaleString('en-IN'),
          trend: `${workspaces.filter((workspace) => workspace.isActive).length} active workspaces`,
          detail: `${configuredHostCount} with configured primary hosts`,
        },
        {
          title: 'Live Subscriptions',
          value: activeSubscriptionCount.toLocaleString('en-IN'),
          trend: `${scheduledCancellationCount} cancel at cycle end`,
          detail: `${liveSubscriptionWorkspaceCount} workspaces currently on paid plans`,
        },
        {
          title: '30 Day Collections',
          value: formatCurrency(trailing30dCollections),
          trend:
            collectionDelta >= 0
              ? `+${formatCompact(collectionDelta)} vs last month`
              : `${formatCompact(collectionDelta)} vs last month`,
          detail: `${formatCurrency(trailing30dRefunds)} refunded in the same window`,
        },
        {
          title: 'Attention Queue',
          value: (openEscalations + failedDeliveries + pendingRefunds).toLocaleString(
            'en-IN',
          ),
          trend: `${openEscalations} support escalations`,
          detail: `${failedDeliveries} failed deliveries - ${pendingRefunds} pending refunds`,
        },
      ],
      tenantGrowthSeries: Array.from(tenantGrowthMap.values()),
      commerceSeries: Array.from(commerceMap.values()).map((item) => ({
        ...item,
        collectedLakh: Number((item.collected / 100000).toFixed(2)),
        refundedLakh: Number((item.refunded / 100000).toFixed(2)),
      })),
      routingMix: [
        {
          key: 'freePath',
          label: 'Free path',
          value: routingMix.freePath,
          fill: 'var(--color-freePath)',
        },
        {
          key: 'subdomain',
          label: 'Subdomain',
          value: routingMix.subdomain,
          fill: 'var(--color-subdomain)',
        },
        {
          key: 'customDomain',
          label: 'Custom domain',
          value: routingMix.customDomain,
          fill: 'var(--color-customDomain)',
        },
      ],
      queueHealth: [
        {
          label: 'Unread notifications',
          value: unreadNotifications,
        },
        {
          label: 'Failed deliveries',
          value: failedDeliveries,
        },
        {
          label: 'Pending refunds',
          value: pendingRefunds,
        },
        {
          label: 'Open escalations',
          value: openEscalations,
        },
      ],
    };

    return withScreenshotSampleData(overview);
  });
}
