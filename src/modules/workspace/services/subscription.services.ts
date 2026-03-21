import {
  workspaceSubscriptionCrud,
  workspaceSubscriptionQueries,
} from '@/modules/workspace/db';

import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';

/**
 * Get subscription by ID
 */
export async function getSubscriptionById(id: string) {
  return workspaceSubscriptionQueries.byId(id);
}

/**
 * Find subscription by provider + providerSubscriptionId
 */
export async function findSubscriptionByProvider(
  provider: string,
  providerSubscriptionId: string,
) {
  return workspaceSubscriptionQueries.findFirst({
    where: {
      provider,
      providerSubscriptionId,
    },
  });
}

/**
 * Get workspace subscription
 */
export async function getWorkspaceSubscription(workspaceId: string) {
  return workspaceSubscriptionQueries.findFirst({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create subscription
 */
export async function createWorkspaceSubscription(
  data: CreateInput<'WorkspaceSubscription'>,
) {
  return workspaceSubscriptionCrud.create(data);
}

/**
 * Update subscription
 */
export async function updateWorkspaceSubscription(
  id: string,
  data: UpdateInput<'WorkspaceSubscription'>,
) {
  return workspaceSubscriptionCrud.update(id, data);
}

/**
 * Cancel subscription
 */
export async function cancelWorkspaceSubscription(id: string) {
  return workspaceSubscriptionCrud.update(id, {
    status: 'cancelled',
    expiresAt: new Date(),
  });
}

/**
 * List workspace subscriptions
 */
export async function listWorkspaceSubscriptions(workspaceId: string) {
  return workspaceSubscriptionQueries.many({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Check if workspace has active subscription
 */
export async function workspaceHasActiveSubscription(workspaceId: string) {
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (!subscription) return false;

  if (subscription.status !== 'active') return false;

  if (subscription.expiresAt && new Date() > subscription.expiresAt) {
    return false;
  }

  return true;
}
