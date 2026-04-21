import {
  webhookEventCrud,
  webhookEventQueries,
} from '@/modules/integration/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { WebhookStatus } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

const MAX_WEBHOOK_ATTEMPTS = 10;
const DEFAULT_WEBHOOK_RETRY_BASE_MS = 60_000; // 1 min
const DEFAULT_WEBHOOK_RETRY_CAP_MS = 30 * 60_000; // 30 min

type ListWebhookEventsParams = {
  provider?: string;
  eventType?: string;
  externalId?: string;
  status?: WebhookStatus;
  workspaceId?: string;
  identityId?: string;
  customerId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  processedFrom?: Date;
  processedTo?: Date;
  take?: number;
  skip?: number;
  orderByCreatedAt?: 'asc' | 'desc';
};

function buildWebhookEventWhere(params?: ListWebhookEventsParams) {
  return {
    ...(params?.provider ? { provider: params.provider } : {}),
    ...(params?.eventType ? { eventType: params.eventType } : {}),
    ...(params?.externalId ? { externalId: params.externalId } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.workspaceId ? { workspaceId: params.workspaceId } : {}),
    ...(params?.identityId ? { identityId: params.identityId } : {}),
    ...(params?.customerId ? { customerId: params.customerId } : {}),
    ...(params?.createdFrom || params?.createdTo
      ? {
          createdAt: {
            ...(params?.createdFrom ? { gte: params.createdFrom } : {}),
            ...(params?.createdTo ? { lte: params.createdTo } : {}),
          },
        }
      : {}),
    ...(params?.processedFrom || params?.processedTo
      ? {
          processedAt: {
            ...(params?.processedFrom ? { gte: params.processedFrom } : {}),
            ...(params?.processedTo ? { lte: params.processedTo } : {}),
          },
        }
      : {}),
  };
}

/**
 * Get webhook event by ID
 */
export async function getWebhookEventById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  const event = await webhookEventQueries.byId(id);
  if (!event) throwError(ERR.NOT_FOUND, 'Webhook event not found');

  return event;
}

/**
 * Find webhook event by provider + external id
 */
export async function findWebhookEvent(provider: string, externalId: string) {
  if (!provider || !externalId) {
    throwError(ERR.INVALID_INPUT, 'provider and externalId are required');
  }

  return webhookEventQueries.findFirst({
    where: { provider, externalId },
  });
}

/**
 * Check if webhook event exists
 */
export async function hasWebhookEvent(provider: string, externalId: string) {
  const event = await findWebhookEvent(provider, externalId);
  return Boolean(event);
}

/**
 * List webhook events with filters
 */
export async function listWebhookEvents(params?: ListWebhookEventsParams) {
  return webhookEventQueries.many({
    where: buildWebhookEventWhere(params),
    orderBy: { createdAt: params?.orderByCreatedAt ?? 'desc' },
    take: params?.take,
    skip: params?.skip,
  });
}

/**
 * Count webhook events with filters
 */
export async function countWebhookEvents(params?: ListWebhookEventsParams) {
  return webhookEventQueries.count(buildWebhookEventWhere(params));
}

/**
 * Find webhook events due for processing
 */
export async function findDueWebhookEvents(params?: {
  take?: number;
  now?: Date;
}) {
  const now = params?.now ?? new Date();

  return webhookEventQueries.many({
    where: {
      status: {
        in: ['RECEIVED', 'FAILED'],
      },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: params?.take ?? 50,
  });
}

/**
 * Create webhook event.
 * If you already have the same provider + externalId, return the existing row.
 */
export async function createWebhookEvent(data: CreateInput<'WebhookEvent'>) {
  if (!data?.provider || !data?.eventType || !data?.externalId) {
    throwError(
      ERR.INVALID_INPUT,
      'provider, eventType and externalId are required',
    );
  }

  const existing = await findWebhookEvent(data.provider, data.externalId);
  if (existing) return existing;

  try {
    return await webhookEventCrud.create({
      ...data,
      status: data.status ?? 'RECEIVED',
      attempts: data.attempts ?? 0,
      nextRetryAt: data.nextRetryAt ?? null,
      processedAt: data.processedAt ?? null,
      error: data.error ?? null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create webhook event', undefined, e);
  }
}

/**
 * Upsert webhook event by provider + externalId.
 * Useful for ingesting provider callbacks safely.
 */
export async function upsertWebhookEvent(
  createData: CreateInput<'WebhookEvent'>,
  updateData: UpdateInput<'WebhookEvent'> = {},
) {
  if (
    !createData?.provider ||
    !createData?.eventType ||
    !createData?.externalId
  ) {
    throwError(
      ERR.INVALID_INPUT,
      'provider, eventType and externalId are required',
    );
  }

  const existing = await findWebhookEvent(
    createData.provider,
    createData.externalId,
  );

  if (!existing) {
    return createWebhookEvent(createData);
  }

  try {
    return await webhookEventCrud.update(existing.id, {
      ...updateData,
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to upsert webhook event', undefined, e);
  }
}

/**
 * Update webhook event
 */
export async function updateWebhookEvent(
  id: string,
  data: UpdateInput<'WebhookEvent'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  try {
    return await webhookEventCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update webhook event', undefined, e);
  }
}

/**
 * Exponential backoff for webhook retries.
 * attempt = 1 => 1 min
 * attempt = 2 => 2 min
 * attempt = 3 => 4 min
 * capped at 30 min
 */
export function getWebhookRetryDelayMs(attempt: number) {
  const safeAttempt = Math.max(1, attempt);

  const delay = DEFAULT_WEBHOOK_RETRY_BASE_MS * 2 ** (safeAttempt - 1);
  return Math.min(delay, DEFAULT_WEBHOOK_RETRY_CAP_MS);
}

/**
 * Claim webhook event for processing.
 * This should be used by the worker before calling external logic.
 */
export async function claimWebhookEventForProcessing(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  const event = await getWebhookEventById(id);

  if (event.status === 'PROCESSED') {
    throwError(ERR.INVALID_STATE, 'Webhook event already processed');
  }

  if (event.status === 'PROCESSING') {
    throwError(ERR.INVALID_STATE, 'Webhook event is already being processed');
  }

  const now = new Date();
  if (
    event.status === 'FAILED' &&
    event.nextRetryAt &&
    event.nextRetryAt > now
  ) {
    throwError(ERR.INVALID_STATE, 'Webhook event is not due for retry yet');
  }

  try {
    return await webhookEventCrud.update(id, {
      status: 'PROCESSING' as WebhookStatus,
      attempts: (event.attempts ?? 0) + 1,
      error: null,
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to claim webhook event', undefined, e);
  }
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookEventProcessed(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  try {
    return await webhookEventCrud.update(id, {
      status: 'PROCESSED' as WebhookStatus,
      processedAt: new Date(),
      nextRetryAt: null,
      error: null,
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to mark webhook event processed',
      undefined,
      e,
    );
  }
}

/**
 * Schedule a retry for webhook event.
 * Use this after a worker fails but retries are still allowed.
 */
export async function scheduleWebhookEventRetry(
  id: string,
  error: string,
  attempts?: number,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  const event = attempts ? await getWebhookEventById(id) : null;
  const currentAttempts = attempts ?? event?.attempts ?? 0;

  if (currentAttempts >= MAX_WEBHOOK_ATTEMPTS) {
    return markWebhookEventDead(id, error);
  }

  const delayMs = getWebhookRetryDelayMs(Math.max(currentAttempts, 1));
  const nextRetryAt = new Date(Date.now() + delayMs);

  try {
    return await webhookEventCrud.update(id, {
      status: 'FAILED' as WebhookStatus,
      error,
      nextRetryAt,
      processedAt: null,
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to schedule webhook retry', undefined, e);
  }
}

/**
 * Mark webhook event as failed with no more retry.
 * This is your terminal failure state.
 */
export async function markWebhookEventDead(id: string, error: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  try {
    return await webhookEventCrud.update(id, {
      status: 'FAILED' as WebhookStatus,
      error,
      nextRetryAt: null,
      processedAt: new Date(),
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to dead-letter webhook event',
      undefined,
      e,
    );
  }
}

/**
 * Mark webhook event as received again.
 * Useful for manual replay or requeue.
 */
export async function requeueWebhookEvent(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');

  try {
    return await webhookEventCrud.update(id, {
      status: 'RECEIVED' as WebhookStatus,
      error: null,
      nextRetryAt: null,
      processedAt: null,
    } as UpdateInput<'WebhookEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to requeue webhook event', undefined, e);
  }
}

/**
 * Mark webhook event as failed immediately without scheduling retry.
 * Use only when you know it should not be retried.
 */
export async function failWebhookEvent(id: string, error: string) {
  return markWebhookEventDead(id, error);
}
