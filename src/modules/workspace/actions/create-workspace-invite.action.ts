'use server';

import { headers } from 'next/headers';
import { createTxAction } from '@/lib/http/create-action';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { buildAbsoluteUrl } from '@/lib/url/absolute-url';
import { assertPermission } from '@/modules/permissions/permissions.services';
import { processNotificationDeliveryOutboxEvent } from '@/modules/notifications/notification-outbox.services';
import { getRoleDefinitionById } from '@/modules/roles/role.services';
import {
  createWorkspaceInviteActionSchema,
  createWorkspaceInviteSchema,
  type CreateWorkspaceInviteActionInput,
  type CreateWorkspaceInviteDomain,
} from '@/modules/workspace/schema';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';
import { createWorkspaceInviteWorkflow } from '@/modules/workspace/workflows/create-workspace-invite.workflow';
import { createWorkspaceInviteNotificationWorkflow } from '@/modules/notifications/workflows/create-workspace-invite-notification.workflow';

function getInviterName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim();

  if (fullName) {
    return fullName;
  }

  return params.email ?? null;
}

const createWorkspaceInviteActionImpl = createTxAction(async (formData: FormData) => {
  const raw = Object.fromEntries(formData.entries());
  const parsed: CreateWorkspaceInviteActionInput =
    createWorkspaceInviteActionSchema.parse(raw);
  const invite: CreateWorkspaceInviteDomain =
    createWorkspaceInviteSchema.parse(parsed);

  const session = await getUserSession();

  if (!session?.workspaceId || !session.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Workspace session missing');
  }

  assertPermission(session.permissions, 'workspaceInvite.create');

  const hdrs = await headers();
  const [result, workspace, inviter] = await Promise.all([
    createWorkspaceInviteWorkflow({
      workspaceId: session.workspaceId,
      invitedById: session.identityId,
      invite,
    }),
    getWorkspaceById(session.workspaceId),
    getIdentityDisplayProfile(session.identityId),
  ]);
  const roleDefinition = await getRoleDefinitionById(result.invite.roleDefinitionId);

  const signupUrl = buildAbsoluteUrl(result.signupPath, {
    host: hdrs.get('x-forwarded-host') || hdrs.get('host'),
    protocol: hdrs.get('x-forwarded-proto'),
  });

  let emailDelivered = true;

  try {
    const notificationResult = await createWorkspaceInviteNotificationWorkflow({
      workspaceId: session.workspaceId,
      inviterIdentityId: session.identityId,
      inviteEmail: result.invite.email,
      workspaceName: workspace?.name ?? 'your workspace',
      signupUrl,
      roleName: roleDefinition?.name ?? result.invite.roleKey,
      inviterName: getInviterName(inviter ?? {}),
      expiresAt: result.invite.expiresAt,
      reused: result.reused,
    });

    for (const event of notificationResult.outboxEvents) {
      await processNotificationDeliveryOutboxEvent(event.id);
    }
  } catch (error) {
    emailDelivered = false;
    console.error('Workspace invite email delivery failed:', error);
  }

  return {
    successMessage: emailDelivered
      ? result.reused
        ? 'A pending invite already existed. Reusing the existing signup link and sending the invite email again.'
        : 'Invite created and email sent successfully.'
      : result.reused
        ? 'A pending invite already existed. The invite is still valid, but the email could not be sent. Use the signup link below.'
      : 'Invite created, but the email could not be sent. Use the signup link below.',
    reused: result.reused,
    emailDelivered,
    invite: {
      id: result.invite.id,
      email: result.invite.email,
      role: result.invite.roleKey,
      roleName: roleDefinition.name ?? result.invite.roleKey,
      roleDefinitionId: result.invite.roleDefinitionId,
      roleSystemKey: result.invite.roleSystemKey ?? null,
      roleRank: null,
      status: result.invite.status,
      token: result.invite.token,
      signupPath: result.signupPath,
      expiresAt: result.invite.expiresAt?.toISOString() ?? null,
      createdAt: result.invite.createdAt.toISOString(),
    },
    signupPath: result.signupPath,
    signupUrl,
  };
});

export async function createWorkspaceInviteAction(formData: FormData) {
  return createWorkspaceInviteActionImpl(formData);
}
