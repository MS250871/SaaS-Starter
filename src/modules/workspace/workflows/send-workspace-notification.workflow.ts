import { NotificationChannel, NotificationTargetType } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { prisma } from '@/lib/prisma';
import { createNotificationWorkflow } from '@/modules/notifications/workflows/create-notification.workflow';
import type { SendWorkspaceNotificationActionInput } from '@/modules/workspace/schema';

type ResolvedRecipient = {
  label: string;
  recipientIdentityId?: string;
  recipientCustomerId?: string;
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
}) {
  if (!params.workspaceId || !params.senderIdentityId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace notification context missing');
  }

  const targetType = getNotificationTargetType(params.input.audience);
  const recipients: ResolvedRecipient[] = [];

  if (params.input.audience === 'workspace') {
    const members = await prisma.membership.findMany({
      where: {
        workspaceId: params.workspaceId,
        isActive: true,
        identityId:
          params.input.recipientMode === 'single'
            ? params.input.recipientId
            : undefined,
        ...(params.input.deliveryChannel === NotificationChannel.EMAIL
          ? {
              identity: {
                is: {
                  email: {
                    not: null,
                  },
                },
              },
            }
          : {}),
      },
      select: {
        identityId: true,
        identity: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    for (const member of members) {
      if (member.identityId === params.senderIdentityId) {
        continue;
      }

      recipients.push({
        recipientIdentityId: member.identityId,
        label:
          `${member.identity.firstName ?? ''} ${member.identity.lastName ?? ''}`.trim() ||
          member.identity.email ||
          'Workspace member',
      });
    }
  } else {
    const customers = await prisma.customer.findMany({
      where: {
        workspaceId: params.workspaceId,
        id:
          params.input.recipientMode === 'single'
            ? params.input.recipientId
            : undefined,
        ...(params.input.deliveryChannel === NotificationChannel.EMAIL
          ? {
              identity: {
                is: {
                  email: {
                    not: null,
                  },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        identity: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    for (const customer of customers) {
      recipients.push({
        recipientCustomerId: customer.id,
        label:
          `${customer.identity.firstName ?? ''} ${customer.identity.lastName ?? ''}`.trim() ||
          customer.identity.email ||
          'Customer',
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
          source: 'workspace_notification_send',
          audience: params.input.audience,
          recipientLabel: recipient.label,
          deliveryChannel: params.input.deliveryChannel,
          sentById: params.senderIdentityId,
          sentByName: params.senderName,
        },
        deliveries,
      }),
    );
  }

  return {
    recipientCount: recipients.length,
    outboxEvents: sentResults.flatMap((result) => result.outboxEvents),
  };
}
