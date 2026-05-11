import { NotificationChannel, NotificationTargetType } from '@/generated/prisma/client';
import { workspaceInviteTemplate } from '@/lib/email/templates/workspace-invite-template';
import { createNotificationWorkflow } from '@/modules/notifications/workflows/create-notification.workflow';

export async function createWorkspaceInviteNotificationWorkflow(params: {
  workspaceId: string;
  inviterIdentityId: string;
  inviteEmail: string;
  workspaceName: string;
  signupUrl: string;
  roleName: string;
  inviterName?: string | null;
  expiresAt?: Date | null;
  reused: boolean;
}) {
  const mail = workspaceInviteTemplate({
    workspaceName: params.workspaceName,
    signupUrl: params.signupUrl,
    role: params.roleName,
    inviterName: params.inviterName,
    expiresAt: params.expiresAt,
  });

  return createNotificationWorkflow({
    workspaceId: params.workspaceId,
    recipientIdentityId: params.inviterIdentityId,
    targetType: NotificationTargetType.IDENTITY,
    type: 'workspace.invite.sent',
    title: params.reused
      ? `Invite reused for ${params.inviteEmail}`
      : `Invite sent to ${params.inviteEmail}`,
    body: params.reused
      ? `${params.inviteEmail} already had a pending invite for ${params.workspaceName}. The existing signup link and email were reused.`
      : `${params.inviteEmail} was invited to join ${params.workspaceName} as ${params.roleName}.`,
    payload: {
      source: 'workspace_invite',
      inviteEmail: params.inviteEmail,
      workspaceName: params.workspaceName,
      roleName: params.roleName,
      signupUrl: params.signupUrl,
      reused: params.reused,
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
