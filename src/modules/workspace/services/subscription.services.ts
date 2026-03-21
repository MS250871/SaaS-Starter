import {
  workspaceSubscriptionCrud,
  workspaceSubscriptionQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

/**
 * Get subscription
 */
export async function getSubscriptionById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Subscription ID required');

  const sub = await workspaceSubscriptionQueries.byId(id);
  if (!sub) throwError(ERR.NOT_FOUND, 'Subscription not found');

  return sub;
}

export async function findSubscriptionByProvider(
  provider: string,
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
  data: CreateInput<'WorkspaceSubscription'>,
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
  data: UpdateInput<'WorkspaceSubscription'>,
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
    status: 'cancelled',
    expiresAt: new Date(),
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
  if (subscription.status !== 'active') return false;
  if (subscription.expiresAt && new Date() > subscription.expiresAt)
    return false;

  return true;
}
