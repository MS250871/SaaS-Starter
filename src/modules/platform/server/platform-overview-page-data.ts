import { withActionTxContext } from '@/lib/request/withActionContext';
import { listPlatformIdentityAdminSnapshots } from '@/modules/auth/services/identity.services';
import { listPlatformPaymentAdminSnapshots } from '@/modules/billing/services/payment.services';
import { listPlatformRefundAdminSnapshots } from '@/modules/billing/services/refund.services';
import { listPlatformSubscriptionAdminSnapshots } from '@/modules/billing/services/subscription.services';
import { listPlatformCustomerAdminSnapshots } from '@/modules/customer/services/customer.services';
import { listPlatformNotificationAdminSnapshots } from '@/modules/notifications/notification.services';
import { listPlatformSupportTicketAdminSnapshots } from '@/modules/support/support.services';
import { listPlatformWorkspaceAdminSnapshots } from '@/modules/workspace/services/workspace.services';
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
  return withActionTxContext(async () => {
    const [
      workspacePage,
      identities,
      customers,
      subscriptions,
      payments,
      refunds,
      tickets,
      notifications,
    ] = await Promise.all([
      listPlatformWorkspaceAdminSnapshots({
        page: 1,
        pageSize: 500,
      }),
      listPlatformIdentityAdminSnapshots({ limit: 500 }),
      listPlatformCustomerAdminSnapshots({ limit: 500 }),
      listPlatformSubscriptionAdminSnapshots(),
      listPlatformPaymentAdminSnapshots(),
      listPlatformRefundAdminSnapshots(),
      listPlatformSupportTicketAdminSnapshots(),
      listPlatformNotificationAdminSnapshots(),
    ]);

    const workspaces = workspacePage.items;
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

    return {
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
  });
}
