'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import {
  getOutboxEventById,
  requeueOutboxEvent,
} from '@/modules/jobs/services/outbox-events.services';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

const requeuePlatformOutboxEventActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const outboxEventId = String(formData.get('outboxEventId') ?? '').trim();

    if (!outboxEventId) {
      throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');
    }

    const event = await getOutboxEventById(outboxEventId);
    await requeueOutboxEvent(event.id);

    return {
      outboxEventId: event.id,
      successMessage: 'Outbox event requeued successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const outboxEventId = String(formData.get('outboxEventId') ?? '').trim();

        return {
          scope: 'PLATFORM' as const,
          category: 'INTEGRATION' as const,
          source: 'ADMIN_PANEL' as const,
          action: 'outbox.event.requeue',
          entityType: 'OutboxEvent',
          entityId: result.outboxEventId || outboxEventId,
          description: 'Outbox event requeued.',
        };
      },
    },
  },
);

export async function requeuePlatformOutboxEventAction(formData: FormData) {
  return requeuePlatformOutboxEventActionImpl(formData);
}
