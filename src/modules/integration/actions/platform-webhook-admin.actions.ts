'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { getRequestContext } from '@/lib/context/request-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { logAdminAction } from '@/modules/audit/services/audit.services';
import {
  getWebhookEventById,
  requeueWebhookEvent,
} from '@/modules/integration/services/webhook-event.services';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

const requeuePlatformWebhookEventActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const webhookEventId = String(formData.get('webhookEventId') ?? '').trim();

    if (!webhookEventId) {
      throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');
    }

    const event = await getWebhookEventById(webhookEventId);
    await requeueWebhookEvent(event.id);

    const requestContext = getRequestContext();
    await logAdminAction({
      adminIdentityId: session.identityId,
      adminEmail: null,
      adminRole: session.platformRoleSystemKeys?.[0] ?? null,
      action: 'webhook.event.requeue',
      entityType: 'WebhookEvent',
      entityId: event.id,
      description: `Webhook event ${event.provider}:${event.eventType} requeued.`,
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      requestId: requestContext.requestId,
    });

    return {
      webhookEventId: event.id,
      successMessage: 'Webhook event requeued successfully.',
    };
  },
);

export async function requeuePlatformWebhookEventAction(formData: FormData) {
  return requeuePlatformWebhookEventActionImpl(formData);
}
