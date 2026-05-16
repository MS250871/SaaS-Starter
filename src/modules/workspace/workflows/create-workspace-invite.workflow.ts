import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getRequestContext } from '@/lib/context/request-context';
import {
  createWorkspaceInvite,
  findPendingWorkspaceInviteByEmail,
} from '@/modules/workspace/services/invite.services';
import type { CreateWorkspaceInviteDomain } from '@/modules/workspace/schema';
import { buildWorkspaceSignupPath } from '@/modules/workspace/routing';

const INVITE_EXPIRY_DAYS = 7;

function buildSignupPath(token: string) {
  const requestContext = getRequestContext();
  const signupPath = buildWorkspaceSignupPath({
    workspaceId: requestContext.workspace?.workspaceId ?? '',
    intent: 'free',
    strategy: requestContext.workspace?.strategy,
    slug: requestContext.workspace?.slug,
  });
  const url = new URL(signupPath, 'https://skillmaxx.local');

  url.searchParams.set('invite', token);
  return `${url.pathname}?${url.searchParams.toString()}`;
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
