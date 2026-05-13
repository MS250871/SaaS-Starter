import {
  workspaceSubscriptionCrud,
  workspaceSubscriptionQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import {
  PaymentProvider,
  SubscriptionStatus,
} from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type WorkspaceActiveSubscriptionPlanSummary =
  Prisma.SubscriptionGetPayload<{
    select: {
      status: true;
      currentPeriodEnd: true;
      price: {
        select: {
          product: {
            select: {
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

/**
 * Get subscription
 */
export async function getSubscriptionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Subscription ID required');

  const sub = await workspaceSubscriptionQueries.findUnique({
    where: { id },
  });
  if (!sub) throwError(ERR.NOT_FOUND, 'Subscription not found');

  return sub;
}

export async function findSubscriptionByProvider(
  provider: PaymentProvider,
  providerSubscriptionId: string,
) {
  if (!provider || !providerSubscriptionId) {
    throwError(ERR.INVALID_INPUT, 'Invalid provider params');
  }

  return workspaceSubscriptionQueries.findFirst({
    where: { provider, providerSubscriptionId },
  });
}

export async function getWorkspaceSubscription(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  return workspaceSubscriptionQueries.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWorkspaceSubscription(
  data: CreateInput<'Subscription'>,
) {
  if (!data?.workspaceId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId required');
  }

  try {
    return await workspaceSubscriptionCrud.create(data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create subscription', undefined, e);
  }
}

export async function updateWorkspaceSubscription(
  id: string,
  data: UpdateInput<'Subscription'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Subscription ID required');

  try {
    return await workspaceSubscriptionCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update subscription', undefined, e);
  }
}

export async function cancelWorkspaceSubscription(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Subscription ID required');

  return updateWorkspaceSubscription(id, {
    status: SubscriptionStatus.CANCELLED,
    currentPeriodEnd: new Date(),
  });
}

export async function listWorkspaceSubscriptions(workspaceId: string) {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  return workspaceSubscriptionQueries.many({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function workspaceHasActiveSubscription(workspaceId: string) {
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (!subscription) return false;
  if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd)
    return false;

  return true;
}

export async function getWorkspaceActiveSubscriptionPlanSummary(
  workspaceId: string,
): Promise<WorkspaceActiveSubscriptionPlanSummary | null> {
  if (!workspaceId) throwError(ERR.INVALID_INPUT, 'workspaceId required');

  const subscription = await workspaceSubscriptionQueries.findFirst({
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
      status: true,
      currentPeriodEnd: true,
      price: {
        select: {
          product: {
            select: {
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

  return subscription as WorkspaceActiveSubscriptionPlanSummary | null;
}
