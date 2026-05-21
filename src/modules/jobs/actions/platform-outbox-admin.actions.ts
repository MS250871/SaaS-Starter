'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/audit.services';
import {
  getOutboxEventById,
  requeueOutboxEvent,
} from '@/modules/jobs/outbox-events.services';
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
    const session = await requirePlatformAdminSession();
    const outboxEventId = String(formData.get('outboxEventId') ?? '').trim();

    if (!outboxEventId) {
      throwError(ERR.INVALID_INPUT, 'Outbox event ID is required');
    }

    const event = await getOutboxEventById(outboxEventId);
    await requeueOutboxEvent(event.id);

    const requestContext = getRequestContext();
    await logAdminAction({
      adminIdentityId: session.identityId,
      adminEmail: null,
      adminRole: session.platformRoleSystemKeys?.[0] ?? null,
      action: 'outbox.event.requeue',
      entityType: 'OutboxEvent',
      entityId: event.id,
      description: `Outbox event ${event.eventType} requeued.`,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
    });

    return {
      outboxEventId: event.id,
      successMessage: 'Outbox event requeued successfully.',
    };
  },
);

export async function requeuePlatformOutboxEventAction(formData: FormData) {
  return requeuePlatformOutboxEventActionImpl(formData);
}
