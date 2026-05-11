import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  createWorkspaceInvite,
  findPendingWorkspaceInviteByEmail,
} from '@/modules/workspace/services/invite.services';
import type { CreateWorkspaceInviteDomain } from '@/modules/workspace/schema';

const INVITE_EXPIRY_DAYS = 7;

function buildSignupPath(token: string) {
  const params = new URLSearchParams({
    entry: 'workspace',
    invite: token,
    intent: 'free',
  });

  return `/signup?${params.toString()}`;
}

export async function createWorkspaceInviteWorkflow(input: {
  workspaceId: string;
  invitedById: string;
  invite: CreateWorkspaceInviteDomain;
}) {
  return withUnitOfWork(async () => {
    const existing = await findPendingWorkspaceInviteByEmail(
      input.workspaceId,
      input.invite.email,
    );

    if (existing) {
      return {
        invite: existing,
        signupPath: buildSignupPath(existing.token),
        reused: true,
      };
    }

    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const invite = await createWorkspaceInvite({
      workspaceId: input.workspaceId,
      email: input.invite.email,
      invitedById: input.invitedById,
      roleKey: input.invite.roleKey,
      expiresAt,
    });

    return {
      invite,
      signupPath: buildSignupPath(invite.token),
      reused: false,
    };
  });
}
