import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  createPlatformInviteEntry,
  findPendingPlatformInviteByEmail,
} from '@/modules/platform/services/invite.services';
import type { CreatePlatformInviteDomain } from '@/modules/platform/schema';

const INVITE_EXPIRY_DAYS = 7;

function buildSignupPath(token: string) {
  const params = new URLSearchParams({
    entry: 'platform',
    invite: token,
  });

  return `/signup?${params.toString()}`;
}

export async function createPlatformInviteWorkflow(input: {
  invitedById: string;
  invite: CreatePlatformInviteDomain;
}) {
  return withUnitOfWork(async () => {
    const existing = await findPendingPlatformInviteByEmail(input.invite.email);

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

    const invite = await createPlatformInviteEntry({
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
