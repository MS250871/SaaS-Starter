import { NotificationChannel, NotificationTargetType } from '@/generated/prisma/client';
import { platformInviteTemplate } from '@/lib/email/templates/platform-invite-template';
import { createNotificationWorkflow } from '@/modules/notifications/workflows/create-notification.workflow';

export async function createPlatformInviteNotificationWorkflow(params: {
  inviterIdentityId: string;
  inviteEmail: string;
  signupUrl: string;
  roleName: string;
  inviterName?: string | null;
  expiresAt?: Date | null;
  reused?: boolean;
  updated?: boolean;
}) {
  const mail = platformInviteTemplate({
    signupUrl: params.signupUrl,
    role: params.roleName,
    inviterName: params.inviterName,
    expiresAt: params.expiresAt,
  });

  const title = params.updated
    ? `Invite role updated for ${params.inviteEmail}`
    : params.reused
      ? `Invite reused for ${params.inviteEmail}`
      : `Invite sent to ${params.inviteEmail}`;

  const body = params.updated
    ? `${params.inviteEmail} was re-sent the platform invite with the updated role ${params.roleName}.`
    : params.reused
      ? `${params.inviteEmail} already had a pending platform invite. The existing signup link and email were reused.`
      : `${params.inviteEmail} was invited to the SkillMaxx platform as ${params.roleName}.`;

  return createNotificationWorkflow({
    recipientIdentityId: params.inviterIdentityId,
    targetType: NotificationTargetType.IDENTITY,
    type: params.updated ? 'platform.invite.updated' : 'platform.invite.sent',
    title,
    body,
    payload: {
      source: 'platform_invite',
      inviteEmail: params.inviteEmail,
      roleName: params.roleName,
      signupUrl: params.signupUrl,
      reused: params.reused ?? false,
      updated: params.updated ?? false,
      expiresAt: params.expiresAt?.toISOString() ?? null,
    },
    deliveries: [
      {
        channel: NotificationChannel.EMAIL,
        recipient: params.inviteEmail,
        subject: mail.subject,
        content: mail.html,
      },
    ],
  });
}
