import { withUnitOfWork } from '@/lib/context/unit-of-work';
import {
  AuthCookies,
  SessionPayload,
  VerificationSession,
} from '@/lib/auth/auth.schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { OtpPurpose, AuthAccountType, type WorkspaceRole } from '@/generated/prisma/enums';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import {
  findAuthAccountByTypeValue,
} from '@/modules/auth/services/authAccount.services';
import { generateOtp } from '@/modules/auth/services/otp.services';
import { createSession } from '@/modules/auth/services/session.services';
import { queueOtpDelivery } from '@/modules/auth/services/otp-outbox.services';
import {
  createMembership,
  findMembership,
  listIdentityMemberships,
} from '@/modules/workspace/services/membership.services';
import {
  acceptInvite,
  validateInviteToken,
} from '@/modules/workspace/services/invite.services';
import {
  acceptPlatformInvite,
  validatePlatformInviteToken,
} from '@/modules/platform/services/invite,services';
import {
  createPlatformMembership,
  findPlatformMembership,
  getPlatformAccessContext,
} from '@/modules/platform/services/membership.services';
import { resolvePermissions } from '@/modules/permissions/permissions.services';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import {
  createCustomer,
  findCustomerByIdentityId,
  findCustomerByWorkspaceIdentity,
} from '@/modules/customer/services/customer.services';

type AuthStep =
  | 'verify_phone'
  | 'workspace_select'
  | 'workspace_create'
  | 'finalize';

type PostLoginResult =
  | {
      nextStep: AuthStep;
      redirectTo: string;
      meta?: {
        verificationId?: string;
        identifier?: string;
        verificationSession?: VerificationSession;
        otp?: string;
        outboxEventId?: string;
      };
      finalSession?: never;
    }
  | {
      finalSession: SessionPayload;
      redirectTo?: string;
      nextStep?: never;
      meta?: never;
    };

const PLATFORM_REDIRECT = '/platform';
const WORKSPACE_REDIRECT = '/app';
const CUSTOMER_REDIRECT = '/customer';
const WORKSPACE_SELECT_REDIRECT = '/select-workspace';
const WORKSPACE_CREATE_REDIRECT = '/create-workspace';
const VERIFY_PHONE_REDIRECT = '/verify-phone';

type WorkspaceMembershipSnapshot = {
  id: string;
  workspaceId: string;
  role: WorkspaceRole;
  planId?: string | null;
};

async function buildFinalSessionWorkflow({
  identitySession,
  customerId,
  workspaceId,
  workspaceMembership: inputWorkspaceMembership,
}: {
  identitySession: SessionPayload;
  customerId?: string;
  workspaceId?: string;
  workspaceMembership?: WorkspaceMembershipSnapshot | null;
}): Promise<SessionPayload> {
  const identityId = identitySession.identityId;

  let workspaceMembership = inputWorkspaceMembership ?? null;

  if (!workspaceMembership && workspaceId) {
    const foundMembership = await findMembership(workspaceId, identityId);

    if (foundMembership) {
      workspaceMembership = {
        id: foundMembership.id,
        workspaceId: foundMembership.workspaceId,
        role: foundMembership.role,
      };
    }
  }

  const workspaceRole = workspaceMembership?.role;
  const membershipId = workspaceMembership?.id;

  const { roles: platformRoles } = await getPlatformAccessContext(identityId);

  const permissions = await resolvePermissions({
    identityId,
    workspaceId,
    workspaceRole,
    platformRoles,
  });

  let features: string[] = [];
  let limits: Record<string, number> = {};

  if (workspaceId) {
    const entitlements = await resolveEntitlements({
      workspaceId,
      planId: workspaceMembership?.planId,
    });

    features = entitlements.features;
    limits = entitlements.limits;
  }

  const session = await createSession({
    identityId,
    workspaceId,
    membershipId,
    workspaceRole,
    ip: identitySession.ip,
    browser: identitySession.browser,
    os: identitySession.os,
    device: identitySession.device,
    deviceId: identitySession.deviceId,
    deviceFingerprint: identitySession.deviceFingerprint,
    userAgent: identitySession.userAgent,
    isActive: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  return {
    sessionId: session.id,
    identityId,
    customerId,
    workspaceId,
    membershipId,
    platformRoles,
    workspaceRole,
    ip: session.ip ?? undefined,
    browser: session.browser ?? undefined,
    os: session.os ?? undefined,
    device: session.device ?? undefined,
    deviceId: session.deviceId ?? undefined,
    deviceFingerprint: session.deviceFingerprint ?? undefined,
    userAgent: session.userAgent ?? undefined,
    isActive: session.isActive,
    permissions,
    features,
    limits,
    createdAt: session.createdAt.getTime(),
    expiresAt: session.expiresAt.getTime(),
  };
}

function toWorkspaceMembershipSnapshot(
  membership: {
    id: string;
    workspaceId: string;
    role: WorkspaceRole;
  } | null,
): WorkspaceMembershipSnapshot | null {
  if (!membership) {
    return null;
  }

  return {
    id: membership.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}

async function buildPhoneVerificationResult(params: {
  identityId: string;
  phoneAuthAccountId: string;
  identifier: string;
  name?: string;
}): Promise<PostLoginResult> {
  const otpResult = await generateOtp({
    authAccountId: params.phoneAuthAccountId,
    otpPurpose: OtpPurpose.SIGNUP,
  });

  const outboxEvent = await queueOtpDelivery({
    identifier: params.identifier,
    otp: otpResult.otp,
    name: params.name,
    brand: 'SkillMaxx',
    verificationId: otpResult.verificationId,
    identityId: params.identityId,
  });

  const verificationSession: VerificationSession = {
    verificationId: otpResult.verificationId,
    authAccountId: params.phoneAuthAccountId,
    otpPurpose: OtpPurpose.SIGNUP,
    mode: 'phone',
    step: 'phone',
    identityId: params.identityId,
    identifier: params.identifier,
    nextPath: '/post-login',
    createdAt: Date.now(),
  };

  return {
    nextStep: 'verify_phone',
    redirectTo: VERIFY_PHONE_REDIRECT,
    meta: {
      verificationSession,
      otp: otpResult.otp,
      outboxEventId: outboxEvent.id,
    },
  };
}

async function ensureWorkspaceCustomer(params: {
  workspaceId: string;
  identityId: string;
}) {
  const existing = await findCustomerByWorkspaceIdentity(
    params.workspaceId,
    params.identityId,
  );

  if (existing) {
    return existing;
  }

  return createCustomer({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
  });
}

async function acceptInviteAccess(params: {
  auth: AuthCookies;
  identityId: string;
  email?: string | null;
}) {
  if (params.auth.mode !== 'invite' || !params.auth.inviteToken) {
    return {
      workspaceMembership: null as WorkspaceMembershipSnapshot | null,
      workspaceId: undefined as string | undefined,
      createdPlatformAccess: false,
    };
  }

  const normalizedEmail = params.email?.toLowerCase();

  if (params.auth.entry === 'platform') {
    const invite = await validatePlatformInviteToken(params.auth.inviteToken);

    if (normalizedEmail && invite.email.toLowerCase() !== normalizedEmail) {
      throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
    }

    const existing = await findPlatformMembership(params.identityId, invite.role);

    if (!existing) {
      await createPlatformMembership({
        identityId: params.identityId,
        role: invite.role,
      });
    }

    await acceptPlatformInvite(invite.id);

    return {
      workspaceMembership: null,
      workspaceId: undefined,
      createdPlatformAccess: true,
    };
  }

  const invite = await validateInviteToken(params.auth.inviteToken);

  if (normalizedEmail && invite.email.toLowerCase() !== normalizedEmail) {
    throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
  }

  let workspaceMembership = await findMembership(
    invite.workspaceId,
    params.identityId,
  );

  if (!workspaceMembership) {
    workspaceMembership = await createMembership({
      identityId: params.identityId,
      workspaceId: invite.workspaceId,
      role: invite.role,
    });
  }

  await acceptInvite(invite.id);

  return {
    workspaceMembership: toWorkspaceMembershipSnapshot(workspaceMembership),
    workspaceId: invite.workspaceId,
    createdPlatformAccess: false,
  };
}

export async function postLoginWorkflow(input: {
  identitySession: SessionPayload;
  auth: AuthCookies;
}): Promise<PostLoginResult> {
  return withUnitOfWork(async () => {
    const { identitySession, auth } = input;
    const identityId = identitySession.identityId;

    const identity = await getIdentityById(identityId);

    const phoneAuthAccount = identity?.phone
      ? await findAuthAccountByTypeValue(AuthAccountType.PHONE, identity.phone)
      : null;

    if (!phoneAuthAccount?.isVerified) {
      if (!phoneAuthAccount) {
        throwError(ERR.INVALID_STATE, 'Phone auth account not found');
      }

      return buildPhoneVerificationResult({
        identityId,
        phoneAuthAccountId: phoneAuthAccount.id,
        identifier: phoneAuthAccount.value,
        name:
          `${identity.firstName ?? ''} ${identity.lastName ?? ''}`.trim() ||
          phoneAuthAccount.value,
      });
    }

    const inviteResolution = await acceptInviteAccess({
      auth,
      identityId,
      email: identity.email,
    });

    const { roles: platformRoles } = await getPlatformAccessContext(identityId);
    const memberships = (
      await listIdentityMemberships(identityId)
    ).filter(
      (
        membership: Awaited<
          ReturnType<typeof listIdentityMemberships>
        >[number],
      ) => membership.isActive,
    );

    const requestedWorkspaceId =
      inviteResolution.workspaceId ?? auth.workspaceId ?? undefined;

    let requestedWorkspaceMembership =
      inviteResolution.workspaceMembership ??
      (requestedWorkspaceId
        ? toWorkspaceMembershipSnapshot(
            memberships.find(
              (
                membership: Awaited<
                  ReturnType<typeof listIdentityMemberships>
                >[number],
              ) => membership.workspaceId === requestedWorkspaceId,
            ) ?? null,
          )
        : null);

    const firstCustomer = await findCustomerByIdentityId(identityId);
    const requestedWorkspaceCustomer = requestedWorkspaceId
      ? await findCustomerByWorkspaceIdentity(requestedWorkspaceId, identityId)
      : null;

    if (auth.flow === 'signup' && auth.mode === 'normal' && auth.entry === 'platform') {
      return {
        nextStep: 'workspace_create',
        redirectTo: WORKSPACE_CREATE_REDIRECT,
      };
    }

    if (auth.flow === 'signup' && auth.mode === 'normal' && auth.entry === 'workspace') {
      if (!auth.workspaceId) {
        throwError(ERR.INVALID_STATE, 'Workspace context missing for workspace signup');
      }

      const customer = await ensureWorkspaceCustomer({
        workspaceId: auth.workspaceId,
        identityId,
      });

      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
        workspaceId: auth.workspaceId,
        customerId: customer.id,
      });

      return {
        finalSession,
        redirectTo: CUSTOMER_REDIRECT,
      };
    }

    if (auth.mode === 'invite' && auth.entry === 'platform') {
      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
      });

      return {
        finalSession,
        redirectTo: PLATFORM_REDIRECT,
      };
    }

    if (auth.mode === 'invite' && auth.entry === 'workspace') {
      if (!requestedWorkspaceId || !requestedWorkspaceMembership) {
        throwError(ERR.INVALID_STATE, 'Workspace invite membership missing');
      }

      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
        workspaceId: requestedWorkspaceId,
        workspaceMembership: requestedWorkspaceMembership,
      });

      return {
        finalSession,
        redirectTo: WORKSPACE_REDIRECT,
      };
    }

    if (auth.entry === 'workspace') {
      if (requestedWorkspaceId && requestedWorkspaceCustomer) {
        const finalSession = await buildFinalSessionWorkflow({
          identitySession,
          customerId: requestedWorkspaceCustomer.id,
          workspaceId: requestedWorkspaceId,
        });

        return {
          finalSession,
          redirectTo: CUSTOMER_REDIRECT,
        };
      }

      if (requestedWorkspaceId && requestedWorkspaceMembership) {
        const finalSession = await buildFinalSessionWorkflow({
          identitySession,
          workspaceId: requestedWorkspaceId,
          workspaceMembership: requestedWorkspaceMembership,
        });

        return {
          finalSession,
          redirectTo: WORKSPACE_REDIRECT,
        };
      }

      if (memberships.length > 1) {
        return {
          nextStep: 'workspace_select',
          redirectTo: WORKSPACE_SELECT_REDIRECT,
        };
      }

      if (memberships.length === 1) {
        requestedWorkspaceMembership = toWorkspaceMembershipSnapshot(memberships[0]);

        const finalSession = await buildFinalSessionWorkflow({
          identitySession,
          workspaceId: memberships[0].workspaceId,
          workspaceMembership: requestedWorkspaceMembership,
        });

        return {
          finalSession,
          redirectTo: WORKSPACE_REDIRECT,
        };
      }

      if (firstCustomer) {
        const finalSession = await buildFinalSessionWorkflow({
          identitySession,
          customerId: firstCustomer.id,
          workspaceId: firstCustomer.workspaceId,
        });

        return {
          finalSession,
          redirectTo: CUSTOMER_REDIRECT,
        };
      }

      throwError(ERR.UNAUTHORIZED, 'No workspace access found');
    }

    if (platformRoles.length > 0) {
      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
      });

      return {
        finalSession,
        redirectTo: PLATFORM_REDIRECT,
      };
    }

    if (memberships.length > 1) {
      return {
        nextStep: 'workspace_select',
        redirectTo: WORKSPACE_SELECT_REDIRECT,
      };
    }

    if (memberships.length === 1) {
      requestedWorkspaceMembership = toWorkspaceMembershipSnapshot(memberships[0]);

      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
        workspaceId: memberships[0].workspaceId,
        workspaceMembership: requestedWorkspaceMembership,
      });

      return {
        finalSession,
        redirectTo: WORKSPACE_REDIRECT,
      };
    }

    if (firstCustomer) {
      const finalSession = await buildFinalSessionWorkflow({
        identitySession,
        customerId: firstCustomer.id,
        workspaceId: firstCustomer.workspaceId,
      });

      return {
        finalSession,
        redirectTo: CUSTOMER_REDIRECT,
      };
    }

    return {
      nextStep: 'workspace_create',
      redirectTo: WORKSPACE_CREATE_REDIRECT,
    };
  });
}
