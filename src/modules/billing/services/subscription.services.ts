import { subscriptionCrud, subscriptionQueries } from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { PaymentProvider, Prisma, SubscriptionStatus } from '@/generated/prisma/client';
import { cancelRazorpaySubscription } from '@/lib/payments/razorpay';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type BillingWorkspaceActiveSubscriptionPlanSummary =
  Prisma.SubscriptionGetPayload<{
    select: {
      id: true;
      status: true;
      currentPeriodStart: true;
      currentPeriodEnd: true;
      providerSubscriptionId: true;
      price: {
        select: {
          id: true;
          amount: true;
          currency: true;
          interval: true;
          product: {
            select: {
              code: true;
              name: true;
              plan: {
                select: {
                  id: true;
                  key: true;
                  name: true;
                  description: true;
                  sortOrder: true;
                };
              };
            };
          };
        };
      };
    };
  }>;

export type PlatformWorkspaceActiveSubscriptionAdminSnapshot =
  Prisma.SubscriptionGetPayload<{
    select: {
      id: true;
      workspaceId: true;
      status: true;
      currentPeriodStart: true;
      currentPeriodEnd: true;
      providerSubscriptionId: true;
      price: {
        select: {
          id: true;
          amount: true;
          currency: true;
          interval: true;
          product: {
            select: {
              id: true;
              code: true;
              name: true;
              plan: {
                select: {
                  id: true;
                  key: true;
                  name: true;
                  description: true;
                  sortOrder: true;
                };
              };
            };
          };
        };
      };
    };
  }>;

export type PlatformSubscriptionAdminSnapshot = Prisma.SubscriptionGetPayload<{
  select: {
    id: true;
    workspaceId: true;
    identityId: true;
    customerId: true;
    status: true;
    currentPeriodStart: true;
    currentPeriodEnd: true;
    cancelAtPeriodEnd: true;
    provider: true;
    providerSubscriptionId: true;
    createdAt: true;
    updatedAt: true;
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        isActive: true;
      };
    };
    identity: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    customer: {
      select: {
        id: true;
        externalId: true;
        identity: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
          };
        };
        workspace: {
          select: {
            id: true;
            name: true;
            slug: true;
          };
        };
      };
    };
    price: {
      select: {
        id: true;
        amount: true;
        currency: true;
        interval: true;
        product: {
          select: {
            id: true;
            code: true;
            name: true;
            plan: {
              select: {
                id: true;
                key: true;
                name: true;
              };
            };
          };
        };
      };
    };
    _count: {
      select: {
        payments: true;
      };
    };
  };
}>;

export async function getSubscriptionById(id: string) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Subscription ID is required');
  }

  const subscription = await subscriptionQueries.findUnique({
    where: { id },
  });

  if (!subscription) {
    throwError(ERR.NOT_FOUND, 'Subscription not found');
  }

  return subscription;
}

export async function findSubscriptionByProviderId(
  provider: PaymentProvider,
  providerSubscriptionId: string,
) {
  if (!provider || !providerSubscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Provider and provider subscription id are required');
  }

  return subscriptionQueries.findFirst({
    where: {
      provider,
      providerSubscriptionId,
    },
  });
}

export async function createSubscription(data: CreateInput<'Subscription'>) {
  if (!data?.priceId || !data?.status || !data?.provider) {
    throwError(ERR.INVALID_INPUT, 'Invalid subscription data');
  }

  try {
    return await subscriptionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create subscription', undefined, e);
  }
}

export async function updateSubscription(
  id: string,
  data: UpdateInput<'Subscription'>,
) {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Subscription ID is required');
  }

  try {
    return await subscriptionCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update subscription', undefined, e);
  }
}

export async function listWorkspaceSubscriptions(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return subscriptionQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listIdentitySubscriptions(identityId: string) {
  if (!identityId) {
    throwError(ERR.INVALID_INPUT, 'Identity ID is required');
  }

  return subscriptionQueries.many({
    where: { identityId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findActiveWorkspaceSubscription(workspaceId: string) {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return subscriptionQueries.findFirst({
    where: {
      workspaceId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cancelOtherWorkspaceSubscriptions(params: {
  workspaceId: string;
  exceptSubscriptionId: string;
  now?: Date;
}) {
  if (!params.workspaceId || !params.exceptSubscriptionId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and exceptSubscriptionId are required');
  }

  const activeSubscriptions = await subscriptionQueries.many({
    where: {
      workspaceId: params.workspaceId,
      id: {
        not: params.exceptSubscriptionId,
      },
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const now = params.now ?? new Date();

  await cancelWorkspaceSubscriptionsByIds({
    subscriptions: activeSubscriptions,
    now,
  });

  return activeSubscriptions.length;
}

async function cancelWorkspaceSubscriptionsByIds(params: {
  subscriptions: Awaited<ReturnType<typeof subscriptionQueries.many>>;
  now: Date;
}) {
  for (const subscription of params.subscriptions) {
    if (
      subscription.provider === 'RAZORPAY' &&
      subscription.providerSubscriptionId
    ) {
      await cancelRazorpaySubscription(
        subscription.providerSubscriptionId,
      ).catch(() => undefined);
    }

    await subscriptionCrud.update(subscription.id, {
      status: 'CANCELLED' satisfies SubscriptionStatus,
      currentPeriodEnd: params.now,
      cancelAtPeriodEnd: false,
    });
  }
}

export async function cancelWorkspaceSubscriptions(params: {
  workspaceId: string;
  now?: Date;
}) {
  if (!params.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  const subscriptions = await subscriptionQueries.many({
    where: {
      workspaceId: params.workspaceId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const now = params.now ?? new Date();

  await cancelWorkspaceSubscriptionsByIds({
    subscriptions,
    now,
  });

  return subscriptions.length;
}

export async function getWorkspaceActiveSubscriptionPlanSummary(
  workspaceId: string,
): Promise<BillingWorkspaceActiveSubscriptionPlanSummary | null> {
  if (!workspaceId) {
    throwError(ERR.INVALID_INPUT, 'Workspace ID is required');
  }

  return subscriptionQueries.delegate.findFirst({
    where: {
      workspaceId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      providerSubscriptionId: true,
      price: {
        select: {
          id: true,
          amount: true,
          currency: true,
          interval: true,
          product: {
            select: {
              code: true,
              name: true,
              plan: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listPlatformWorkspaceActiveSubscriptionAdminSnapshots(
  workspaceIds?: string[],
): Promise<PlatformWorkspaceActiveSubscriptionAdminSnapshot[]> {
  const normalizedWorkspaceIds = Array.from(
    new Set((workspaceIds ?? []).filter(Boolean)),
  );

  const subscriptions = await subscriptionQueries.delegate.findMany({
    where: {
      workspaceId:
        normalizedWorkspaceIds.length > 0
          ? {
              in: normalizedWorkspaceIds,
            }
          : {
              not: null,
            },
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      workspaceId: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      providerSubscriptionId: true,
      price: {
        select: {
          id: true,
          amount: true,
          currency: true,
          interval: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              plan: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const latestByWorkspace = new Map<
    string,
    PlatformWorkspaceActiveSubscriptionAdminSnapshot
  >();

  for (const subscription of subscriptions) {
    if (!subscription.workspaceId || latestByWorkspace.has(subscription.workspaceId)) {
      continue;
    }

    latestByWorkspace.set(
      subscription.workspaceId,
      subscription as PlatformWorkspaceActiveSubscriptionAdminSnapshot,
    );
  }

  return Array.from(latestByWorkspace.values());
}

export async function listPlatformSubscriptionAdminSnapshots(opts?: {
  limit?: number;
}): Promise<PlatformSubscriptionAdminSnapshot[]> {
  const subscriptions = await subscriptionQueries.delegate.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 500,
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      customerId: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
      providerSubscriptionId: true,
      createdAt: true,
      updatedAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      identity: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      customer: {
        select: {
          id: true,
          externalId: true,
          identity: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      price: {
        select: {
          id: true,
          amount: true,
          currency: true,
          interval: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              plan: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          payments: true,
        },
      },
    },
  });

  return subscriptions as PlatformSubscriptionAdminSnapshot[];
}

export async function getPlatformSubscriptionAdminSnapshot(
  id: string,
): Promise<PlatformSubscriptionAdminSnapshot> {
  if (!id) {
    throwError(ERR.INVALID_INPUT, 'Subscription ID is required');
  }

  const subscription = await subscriptionQueries.delegate.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      identityId: true,
      customerId: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
      providerSubscriptionId: true,
      createdAt: true,
      updatedAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      identity: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      customer: {
        select: {
          id: true,
          externalId: true,
          identity: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      price: {
        select: {
          id: true,
          amount: true,
          currency: true,
          interval: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              plan: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          payments: true,
        },
      },
    },
  });

  if (!subscription) {
    throwError(ERR.NOT_FOUND, 'Subscription not found');
  }

  return subscription as PlatformSubscriptionAdminSnapshot;
}
