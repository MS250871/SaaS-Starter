import { outboxEventCrud, outboxEventQueries } from '@/modules/jobs/db';
import type { CreateInput, UpdateInput } from '@/lib/crud/prisma-types';
import type { OutboxStatus } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

const MAX_OUTBOX_ATTEMPTS = 10;
const DEFAULT_OUTBOX_RETRY_BASE_MS = 60_000; // 1 min
const DEFAULT_OUTBOX_RETRY_CAP_MS = 30 * 60_000; // 30 min

type ListOutboxEventsParams = {
  eventType?: string;
  processingKey?: string;
  jobId?: string;
  status?: OutboxStatus;
  workspaceId?: string;
  identityId?: string;
  customerId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  processedFrom?: Date;
  processedTo?: Date;
  take?: number;
  skip?: number;
  orderByCreatedAt?: 'asc' | 'desc';
};

function buildOutboxEventWhere(params?: ListOutboxEventsParams) {
  return {
    ...(params?.eventType ? { eventType: params.eventType } : {}),
    ...(params?.processingKey ? { processingKey: params.processingKey } : {}),
    ...(params?.jobId ? { jobId: params.jobId } : {}),
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
    ...(params?.scheduledFrom || params?.scheduledTo
      ? {
          scheduledAt: {
            ...(params?.scheduledFrom ? { gte: params.scheduledFrom } : {}),
            ...(params?.scheduledTo ? { lte: params.scheduledTo } : {}),
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
 * Get outbox event by ID
 */
export async function getOutboxEventById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  const event = await outboxEventQueries.byId(id);
  if (!event) throwError(ERR.NOT_FOUND, 'Outbox event not found');

  return event;
}

/**
 * Find outbox event by processing key
 */
export async function findOutboxEventByProcessingKey(processingKey: string) {
  if (!processingKey) {
    throwError(ERR.INVALID_INPUT, 'processingKey is required');
  }

  return outboxEventQueries.findFirst({
    where: { processingKey },
  });
}

/**
 * Check if outbox event exists
 */
export async function hasOutboxEvent(processingKey: string) {
  const event = await findOutboxEventByProcessingKey(processingKey);
  return Boolean(event);
}

/**
 * List outbox events with filters
 */
export async function listOutboxEvents(params?: ListOutboxEventsParams) {
  return outboxEventQueries.many({
    where: buildOutboxEventWhere(params),
    orderBy: { createdAt: params?.orderByCreatedAt ?? 'desc' },
    take: params?.take,
    skip: params?.skip,
  });
}

/**
 * Count outbox events with filters
 */
export async function countOutboxEvents(params?: ListOutboxEventsParams) {
  return outboxEventQueries.count(buildOutboxEventWhere(params));
}

/**
 * Find outbox events due for processing.
 */
export async function findDueOutboxEvents(params?: {
  take?: number;
  now?: Date;
}) {
  const now = params?.now ?? new Date();

  return outboxEventQueries.many({
    where: {
      status: {
        in: ['PENDING', 'FAILED'],
      },
      AND: [
        {
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
        {
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
        {
          lockedAt: null,
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: params?.take ?? 50,
  });
}

/**
 * Create outbox event.
 * If a processingKey already exists, return the existing row.
 */
export async function createOutboxEvent(data: CreateInput<'OutboxEvent'>) {
  if (!data?.eventType) {
    throwError(ERR.INVALID_INPUT, 'eventType is required');
  }

  if (data.processingKey) {
    const existing = await findOutboxEventByProcessingKey(data.processingKey);
    if (existing) return existing;
  }

  try {
    return await outboxEventCrud.create({
      ...data,
      status: data.status ?? 'PENDING',
      attempts: data.attempts ?? 0,
      nextRetryAt: data.nextRetryAt ?? null,
      scheduledAt: data.scheduledAt ?? null,
      lockedAt: data.lockedAt ?? null,
      jobId: data.jobId ?? null,
      processedAt: data.processedAt ?? null,
      lastError: data.lastError ?? null,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create outbox event', undefined, e);
  }
}

/**
 * Upsert outbox event by processingKey.
 * If processingKey is omitted, this behaves like create.
 */
export async function upsertOutboxEvent(
  createData: CreateInput<'OutboxEvent'>,
  updateData: UpdateInput<'OutboxEvent'> = {},
) {
  if (!createData?.eventType) {
    throwError(ERR.INVALID_INPUT, 'eventType is required');
  }

  if (!createData.processingKey) {
    return createOutboxEvent(createData);
  }

  const existing = await findOutboxEventByProcessingKey(createData.processingKey);

  if (!existing) {
    return createOutboxEvent(createData);
  }

  try {
    return await outboxEventCrud.update(existing.id, {
      ...updateData,
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to upsert outbox event', undefined, e);
  }
}

/**
 * Update outbox event
 */
export async function updateOutboxEvent(
  id: string,
  data: UpdateInput<'OutboxEvent'>,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  try {
    return await outboxEventCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update outbox event', undefined, e);
  }
}

/**
 * Exponential backoff for outbox retries.
 */
export function getOutboxRetryDelayMs(attempt: number) {
  const safeAttempt = Math.max(1, attempt);

  const delay = DEFAULT_OUTBOX_RETRY_BASE_MS * 2 ** (safeAttempt - 1);
  return Math.min(delay, DEFAULT_OUTBOX_RETRY_CAP_MS);
}

/**
 * Claim outbox event for processing.
 */
export async function claimOutboxEventForProcessing(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  const event = await getOutboxEventById(id);

  if (event.status === 'DONE') {
    throwError(ERR.INVALID_STATE, 'Outbox event already processed');
  }

  if (event.status === 'PROCESSING') {
    throwError(ERR.INVALID_STATE, 'Outbox event is already being processed');
  }

  const now = new Date();

  if (event.scheduledAt && event.scheduledAt > now) {
    throwError(ERR.INVALID_STATE, 'Outbox event is not scheduled yet');
  }

  if (event.status === 'FAILED' && event.nextRetryAt && event.nextRetryAt > now) {
    throwError(ERR.INVALID_STATE, 'Outbox event is not due for retry yet');
  }

  if (event.lockedAt) {
    throwError(ERR.INVALID_STATE, 'Outbox event is already locked');
  }

  try {
    return await outboxEventCrud.update(id, {
      status: 'PROCESSING' as OutboxStatus,
      attempts: (event.attempts ?? 0) + 1,
      lockedAt: now,
      lastError: null,
      processedAt: null,
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to claim outbox event', undefined, e);
  }
}

/**
 * Backward-compatible alias.
 */
export async function markOutboxEventProcessing(id: string) {
  return claimOutboxEventForProcessing(id);
}

/**
 * Mark outbox event as done
 */
export async function markOutboxEventDone(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  try {
    return await outboxEventCrud.update(id, {
      status: 'DONE' as OutboxStatus,
      processedAt: new Date(),
      lockedAt: null,
      nextRetryAt: null,
      lastError: null,
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to mark outbox event done', undefined, e);
  }
}

/**
 * Schedule a retry for outbox event.
 */
export async function scheduleOutboxEventRetry(
  id: string,
  error: string,
  attempts?: number,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  const event = attempts ? await getOutboxEventById(id) : null;
  const currentAttempts = attempts ?? event?.attempts ?? 0;

  if (currentAttempts >= MAX_OUTBOX_ATTEMPTS) {
    return markOutboxEventDead(id, error);
  }

  const delayMs = getOutboxRetryDelayMs(Math.max(currentAttempts, 1));
  const nextRetryAt = new Date(Date.now() + delayMs);

  try {
    return await outboxEventCrud.update(id, {
      status: 'FAILED' as OutboxStatus,
      lockedAt: null,
      lastError: error,
      nextRetryAt,
      processedAt: null,
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to schedule outbox retry', undefined, e);
  }
}

/**
 * Mark outbox event as failed without any more retry.
 */
export async function markOutboxEventDead(id: string, error: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  try {
    return await outboxEventCrud.update(id, {
      status: 'FAILED' as OutboxStatus,
      lockedAt: null,
      lastError: error,
      nextRetryAt: null,
      processedAt: new Date(),
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(
      ERR.DB_ERROR,
      'Failed to dead-letter outbox event',
      undefined,
      e,
    );
  }
}

/**
 * Mark outbox event as failed.
 * If nextRetryAt is provided, it stays retryable.
 */
export async function markOutboxEventFailed(
  id: string,
  error: string,
  nextRetryAt?: Date | null,
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  try {
    return await outboxEventCrud.update(id, {
      status: 'FAILED' as OutboxStatus,
      lockedAt: null,
      lastError: error,
      nextRetryAt: nextRetryAt ?? null,
      processedAt: nextRetryAt ? null : new Date(),
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to mark outbox event failed', undefined, e);
  }
}

/**
 * Mark outbox event as pending again.
 */
export async function requeueOutboxEvent(
  id: string,
  opts?: { scheduledAt?: Date | null },
) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');

  try {
    return await outboxEventCrud.update(id, {
      status: 'PENDING' as OutboxStatus,
      lockedAt: null,
      nextRetryAt: null,
      processedAt: null,
      lastError: null,
      scheduledAt: opts?.scheduledAt ?? null,
    } as UpdateInput<'OutboxEvent'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to requeue outbox event', undefined, e);
  }
}

/**
 * Attach QStash / queue job ID after publish
 */
export async function setOutboxJobId(id: string, jobId: string) {
  if (!id || !jobId) {
    throwError(ERR.INVALID_INPUT, 'id and jobId are required');
  }

  return updateOutboxEvent(id, {
    jobId,
  } as UpdateInput<'OutboxEvent'>);
}
