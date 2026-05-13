import { subscriptionCrud, subscriptionQueries } from '@/modules/billing/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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
