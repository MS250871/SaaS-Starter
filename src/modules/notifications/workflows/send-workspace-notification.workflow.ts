import { NotificationChannel, NotificationTargetType } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createNotificationWorkflow } from '@/modules/notifications/workflows/create-notification.workflow';
import type { SendWorkspaceNotificationActionInput } from '@/modules/notifications/schema';
import { listWorkspaceNotificationRecipientCustomers } from '@/modules/customer/services/customer.services';
import { listWorkspaceNotificationRecipientMembers } from '@/modules/workspace/services/membership.services';

type ResolvedRecipient = {
  label: string;
  recipientIdentityId?: string;
  recipientCustomerId?: string;
  deliveryRecipient?: string;
};

function getNotificationTargetType(
  audience: SendWorkspaceNotificationActionInput['audience'],
) {
  return audience === 'workspace'
    ? NotificationTargetType.IDENTITY
    : NotificationTargetType.CUSTOMER;
}

export async function sendWorkspaceNotificationWorkflow(params: {
  workspaceId: string;
  senderIdentityId: string;
  senderName: string;
  input: SendWorkspaceNotificationActionInput;
  payloadSource?: string;
  senderScope?: 'workspace' | 'platform';
}) {
  if (!params.workspaceId || !params.senderIdentityId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace notification context missing');
  }

  const targetType = getNotificationTargetType(params.input.audience);
  const recipients: ResolvedRecipient[] = [];

  if (params.input.audience === 'workspace') {
    const members = await listWorkspaceNotificationRecipientMembers({
      workspaceId: params.workspaceId,
      recipientMode: params.input.recipientMode,
      recipientId: params.input.recipientId,
      requireEmail: params.input.deliveryChannel === NotificationChannel.EMAIL,
      excludeIdentityId: params.senderIdentityId,
    });

    for (const member of members) {
      recipients.push({
        recipientIdentityId: member.identityId,
        label:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
        deliveryRecipient:
          params.input.deliveryChannel === NotificationChannel.IN_APP
            ? member.identityId
            : member.identity.email?.trim().toLowerCase(),
      });
    }
  } else {
    const customers = await listWorkspaceNotificationRecipientCustomers({
      workspaceId: params.workspaceId,
      recipientMode: params.input.recipientMode,
      recipientId: params.input.recipientId,
      requireEmail: params.input.deliveryChannel === NotificationChannel.EMAIL,
    });

    for (const customer of customers) {
      recipients.push({
        recipientCustomerId: customer.id,
        label:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
        deliveryRecipient:
          params.input.deliveryChannel === NotificationChannel.IN_APP
            ? customer.id
            : customer.identity.email?.trim().toLowerCase(),
      });
    }
  }

  if (recipients.length === 0) {
    throwError(
      ERR.INVALID_INPUT,
      params.input.recipientMode === 'single'
        ? 'Recipient not found in this workspace'
        : 'No recipients are available for this audience',
    );
  }

  const deliveries =
    params.input.deliveryChannel === NotificationChannel.IN_APP
      ? [
          {
            channel: NotificationChannel.IN_APP,
          },
        ]
      : [
          {
            channel: NotificationChannel.EMAIL,
          },
        ];

  const sentResults = [];

  for (const recipient of recipients) {
    sentResults.push(
      await createNotificationWorkflow({
        workspaceId: params.workspaceId,
        recipientIdentityId: recipient.recipientIdentityId,
        recipientCustomerId: recipient.recipientCustomerId,
        targetType,
        type: 'workspace.notification.sent_external',
        title: params.input.title,
        body: params.input.body,
        payload: {
          source: params.payloadSource ?? 'workspace_notification_send',
          audience: params.input.audience,
          recipientLabel: recipient.label,
          deliveryChannel: params.input.deliveryChannel,
          sentById: params.senderIdentityId,
          sentByName: params.senderName,
          senderScope: params.senderScope ?? 'workspace',
        },
        deliveries: deliveries.map((delivery) => ({
          ...delivery,
          recipient: recipient.deliveryRecipient,
        })),
      }),
    );
  }

  return {
    recipientCount: recipients.length,
    outboxEvents: sentResults.flatMap((result) => result.outboxEvents),
  };
}
