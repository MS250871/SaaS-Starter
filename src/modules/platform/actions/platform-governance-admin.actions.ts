'use server';

import type { Prisma } from '@/generated/prisma/client';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { createTxAction } from '@/lib/http/create-action';
import { headers } from 'next/headers';
import { getIdentityDisplayProfile } from '@/modules/auth/services/identity.services';
import { dispatchNotificationDeliveryOutboxEvent } from '@/modules/notifications/services/notification-outbox.services';
import { createPlatformInviteNotificationWorkflow } from '@/modules/notifications/workflows/create-platform-invite-notification.workflow';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';
import {
  activatePlatformMembership,
  deactivatePlatformMembership,
  getPlatformMembershipById,
  updatePlatformMembershipRole,
} from '@/modules/platform/services/membership.services';
import {
  getPlatformInviteById,
  revokePlatformInvite,
  updatePlatformInviteRole,
} from '@/modules/platform/services/invite.services';
import {
  changePlatformInviteRoleActionSchema,
  changePlatformInviteRoleSchema,
  changePlatformMembershipRoleActionSchema,
  changePlatformMembershipRoleSchema,
  createPlatformInviteActionSchema,
  createPlatformInviteSchema,
  type ChangePlatformInviteRoleActionInput,
  type ChangePlatformInviteRoleDomain,
  type ChangePlatformMembershipRoleActionInput,
  type ChangePlatformMembershipRoleDomain,
  type CreatePlatformInviteActionInput,
  type CreatePlatformInviteDomain,
} from '@/modules/platform/schema';
import { createPlatformInviteWorkflow } from '@/modules/platform/workflows/create-platform-invite.workflow';
import { buildAbsoluteUrl } from '@/lib/url/absolute-url';
import { getRoleDefinitionById } from '@/modules/roles/services/role.services';

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

function buildPlatformInviteSignupPath(token: string) {
  const params = new URLSearchParams({
    entry: 'platform',
    invite: token,
  });

  return `/signup?${params.toString()}`;
}

async function requirePlatformAdminSession() {
  const session = await getUserSession();

  if (!session?.identityId) {
    throwError(ERR.UNAUTHORIZED, 'Platform session missing');
  }

  assertPlatformAdminAccess(session.platformRoleSystemKeys ?? []);

  return session;
}

function buildGovernanceAuditInput(params: {
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return {
    scope: 'PLATFORM' as const,
    category: 'GOVERNANCE' as const,
    source: 'ADMIN_PANEL' as const,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata ?? undefined,
  };
}

const togglePlatformMembershipActiveActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const membershipId = String(formData.get('membershipId') ?? '').trim();
    const isActive =
      String(formData.get('isActive') ?? '').trim().toLowerCase() === 'true';

    if (!membershipId) {
      throwError(ERR.INVALID_INPUT, 'Platform membership ID is required');
    }

    const membership = isActive
      ? await activatePlatformMembership(membershipId)
      : await deactivatePlatformMembership(membershipId);

    return {
      membershipId: membership.id,
      successMessage: `Platform membership ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
    };
  },
  {
    audit: {
      onSuccess: ({ args, result }) => {
        const formData = args[0];
        const isActive =
          String(formData.get('isActive') ?? '').trim().toLowerCase() ===
          'true';

        return buildGovernanceAuditInput({
          action: isActive
            ? 'platform.membership.activate'
            : 'platform.membership.deactivate',
          entityType: 'PlatformMembership',
          entityId: result.membershipId,
          description: `Platform membership ${
            isActive ? 'activated' : 'deactivated'
          }.`,
        });
      },
    },
  },
);

const createPlatformInviteActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: CreatePlatformInviteActionInput =
      createPlatformInviteActionSchema.parse(raw);
    const inviteInput: CreatePlatformInviteDomain =
      createPlatformInviteSchema.parse(parsed);
    const hdrs = await headers();

    const [result, inviter] = await Promise.all([
      createPlatformInviteWorkflow({
        invitedById: session.identityId,
        invite: inviteInput,
      }),
      getIdentityDisplayProfile(session.identityId),
    ]);
    const roleDefinition = await getRoleDefinitionById(
      result.invite.roleDefinitionId,
    );

    const signupUrl = buildAbsoluteUrl(result.signupPath, {
      host: hdrs.get('x-forwarded-host') || hdrs.get('host'),
      protocol: hdrs.get('x-forwarded-proto'),
    });

    let emailDelivered = true;

    try {
      const notificationResult = await createPlatformInviteNotificationWorkflow({
        inviterIdentityId: session.identityId,
        inviteEmail: result.invite.email,
        signupUrl,
        roleName: roleDefinition.name ?? result.invite.roleKey,
        inviterName: getInviterName(inviter ?? {}),
        expiresAt: result.invite.expiresAt,
        reused: result.reused,
      });

      for (const event of notificationResult.outboxEvents) {
        await dispatchNotificationDeliveryOutboxEvent(event.id);
      }
    } catch (error) {
      emailDelivered = false;
      console.error('Platform invite email queueing failed:', error);
    }

    return {
      inviteId: result.invite.id,
    successMessage: emailDelivered
      ? result.reused
          ? 'A pending platform invite already existed. Reusing the existing signup link and queueing the invite email again.'
          : 'Platform invite created and email queued successfully.'
        : result.reused
          ? 'A pending platform invite already existed. The invite is still valid, but the email could not be queued. Use the signup link below.'
          : 'Platform invite created, but the email could not be queued. Use the signup link below.',
      reused: result.reused,
      emailDelivered,
      signupPath: result.signupPath,
      signupUrl,
      invite: {
        id: result.invite.id,
        email: result.invite.email,
        roleName: roleDefinition.name ?? result.invite.roleKey,
        roleKey: result.invite.roleKey,
        roleSystemKey: result.invite.roleSystemKey ?? null,
        status: result.invite.status,
        signupPath: result.signupPath,
        expiresAt: result.invite.expiresAt?.toISOString() ?? null,
        createdAt: result.invite.createdAt.toISOString(),
      },
    };
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildGovernanceAuditInput({
          action: result.reused
            ? 'platform.invite.reuse'
            : 'platform.invite.create',
          entityType: 'PlatformInvite',
          entityId: result.inviteId,
          description: result.reused
            ? `Existing platform invite reused for ${result.invite.email}.`
            : `Platform invite created for ${result.invite.email}.`,
          metadata: {
            emailDelivered: result.emailDelivered,
            roleKey: result.invite.roleKey,
            roleSystemKey: result.invite.roleSystemKey,
            reused: result.reused,
          },
        }),
    },
  },
);

const revokePlatformInviteActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();

    const inviteId = String(formData.get('inviteId') ?? '').trim();

    if (!inviteId) {
      throwError(ERR.INVALID_INPUT, 'Platform invite ID is required');
    }

    const invite = await revokePlatformInvite(inviteId);

    return {
      inviteId: invite.id,
      successMessage: 'Platform invite revoked successfully.',
    };
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildGovernanceAuditInput({
          action: 'platform.invite.revoke',
          entityType: 'PlatformInvite',
          entityId: result.inviteId,
          description: 'Platform invite revoked.',
        }),
    },
  },
);

const changePlatformInviteRoleActionImpl = createTxAction(
  async (formData: FormData) => {
    const session = await requirePlatformAdminSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: ChangePlatformInviteRoleActionInput =
      changePlatformInviteRoleActionSchema.parse(raw);
    const input: ChangePlatformInviteRoleDomain =
      changePlatformInviteRoleSchema.parse(parsed);

    const currentInvite = await getPlatformInviteById(input.inviteId);

    if (currentInvite.status !== 'PENDING') {
      throwError(
        ERR.INVALID_INPUT,
        'Only pending platform invites can change role',
      );
    }

    const invite = await updatePlatformInviteRole(input.inviteId, {
      roleKey: input.roleKey,
    });
    const roleDefinition = await getRoleDefinitionById(invite.roleDefinitionId);
    const hdrs = await headers();
    const signupUrl = buildAbsoluteUrl(
      buildPlatformInviteSignupPath(currentInvite.token),
      {
        host: hdrs.get('x-forwarded-host') || hdrs.get('host'),
        protocol: hdrs.get('x-forwarded-proto'),
      },
    );
    const inviter = await getIdentityDisplayProfile(session.identityId);

    try {
      const notificationResult = await createPlatformInviteNotificationWorkflow({
        inviterIdentityId: session.identityId,
        inviteEmail: invite.email,
        signupUrl,
        roleName: roleDefinition.name ?? invite.roleKey,
        inviterName: getInviterName(inviter ?? {}),
        expiresAt: currentInvite.expiresAt,
        updated: true,
      });

      for (const event of notificationResult.outboxEvents) {
        await dispatchNotificationDeliveryOutboxEvent(event.id);
      }
    } catch (error) {
      console.error('Platform invite role update email queueing failed:', error);
    }

    return {
      inviteId: invite.id,
      successMessage: 'Platform invite role updated successfully.',
      roleName: roleDefinition.name ?? invite.roleKey,
      roleKey: invite.roleKey,
      roleSystemKey: invite.roleSystemKey ?? null,
    };
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildGovernanceAuditInput({
          action: 'platform.invite.changeRole',
          entityType: 'PlatformInvite',
          entityId: result.inviteId,
          description: `Platform invite moved to role ${result.roleName}.`,
          metadata: {
            roleKey: result.roleKey,
            roleSystemKey: result.roleSystemKey,
          },
        }),
    },
  },
);

const changePlatformMembershipRoleActionImpl = createTxAction(
  async (formData: FormData) => {
    await requirePlatformAdminSession();
    const raw = Object.fromEntries(formData.entries());
    const parsed: ChangePlatformMembershipRoleActionInput =
      changePlatformMembershipRoleActionSchema.parse(raw);
    const input: ChangePlatformMembershipRoleDomain =
      changePlatformMembershipRoleSchema.parse(parsed);

    await getPlatformMembershipById(input.membershipId);
    const membership = await updatePlatformMembershipRole(input.membershipId, {
      roleKey: input.roleKey,
    });
    const roleDefinition = await getRoleDefinitionById(
      membership.roleDefinitionId,
    );

    return {
      membershipId: membership.id,
      successMessage: 'Platform membership role updated successfully.',
      roleName: roleDefinition.name ?? membership.roleKey,
      roleKey: membership.roleKey,
      roleSystemKey: membership.roleSystemKey ?? null,
    };
  },
  {
    audit: {
      onSuccess: ({ result }) =>
        buildGovernanceAuditInput({
          action: 'platform.membership.changeRole',
          entityType: 'PlatformMembership',
          entityId: result.membershipId,
          description: `Platform membership moved to role ${result.roleName}.`,
          metadata: {
            roleKey: result.roleKey,
            roleSystemKey: result.roleSystemKey,
          },
        }),
    },
  },
);

export async function togglePlatformMembershipActiveAction(formData: FormData) {
  return togglePlatformMembershipActiveActionImpl(formData);
}

export async function createPlatformInviteAction(formData: FormData) {
  return createPlatformInviteActionImpl(formData);
}

export async function revokePlatformInviteAction(formData: FormData) {
  return revokePlatformInviteActionImpl(formData);
}

export async function changePlatformInviteRoleAction(formData: FormData) {
  return changePlatformInviteRoleActionImpl(formData);
}

export async function changePlatformMembershipRoleAction(formData: FormData) {
  return changePlatformMembershipRoleActionImpl(formData);
}
