'use server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
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
    await requirePlatformAdminSession();
    const webhookEventId = String(formData.get('webhookEventId') ?? '').trim();

    if (!webhookEventId) {
      throwError(ERR.INVALID_INPUT, 'Webhook event ID is required');
    }

    const event = await getWebhookEventById(webhookEventId);
    await requeueWebhookEvent(event.id);

    return {
      webhookEventId: event.id,
      successMessage: 'Webhook event requeued successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const webhookEventId = String(
          formData.get('webhookEventId') ?? '',
        ).trim();

        return {
          scope: 'PLATFORM' as const,
          category: 'INTEGRATION' as const,
          source: 'ADMIN_PANEL' as const,
          action: 'webhook.event.requeue',
          entityType: 'WebhookEvent',
          entityId: result.webhookEventId || webhookEventId,
          description: 'Webhook event requeued.',
        };
      },
    },
  },
);

export async function requeuePlatformWebhookEventAction(formData: FormData) {
  return requeuePlatformWebhookEventActionImpl(formData);
}
