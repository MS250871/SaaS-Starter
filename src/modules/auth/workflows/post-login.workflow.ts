import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { runWithActor } from '@/lib/context/actor-context';
import {
  AuthCookies,
  SessionPayload,
  VerificationSession,
} from '@/lib/auth/auth.schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { OtpPurpose, AuthAccountType } from '@/generated/prisma/enums';
import { getIdentityById } from '@/modules/auth/services/identity.services';
import {
  findAuthAccountByTypeValue,
} from '@/modules/auth/services/authAccount.services';
import {
  generateOtp,
  getLatestOtpRequestForAccount,
  isOtpExpired,
} from '@/modules/auth/services/otp.services';
import {
  createSession,
  expireIdentitySessionsIfNeeded,
  endSession,
  findActiveSessionByContext,
} from '@/modules/auth/services/session.services';
import { USER_SESSION_LIFETIME_SECONDS } from '@/lib/auth/auth-config';
import { queueOtpDelivery } from '@/modules/auth/services/otp-outbox.services';
import {
  createMembership,
  findMembership,
  listIdentityMemberships,
} from '@/modules/workspace/services/membership.services';
import {
  acceptInvite,
  findInviteByToken,
  isInviteExpired,
  validateInviteToken,
} from '@/modules/workspace/services/invite.services';
import {
  acceptPlatformInvite,
  findPlatformInviteByToken,
  isPlatformInviteExpired,
  validatePlatformInviteToken,
} from '@/modules/platform/services/invite,services';
import {
  createPlatformMembership,
  findPlatformMembership,
  getPlatformAccessContext,
} from '@/modules/platform/services/membership.services';
import { resolvePermissions } from '@/modules/permissions/permissions.services';
import type {
  PlatformRoleSystemKey,
  WorkspaceRoleSystemKey,
} from '@/modules/roles/role.types';
import { resolveEntitlements } from '@/modules/entitlements/entitlement.services';
import {
  createCustomer,
  findCustomerByIdentityId,
  findCustomerByWorkspaceIdentity,
} from '@/modules/customer/services/customer.services';
import { getWorkspaceById } from '@/modules/workspace/services/workspace.services';
import { getWorkspaceSettings } from '@/modules/workspace/services/setting.services';
import { SessionEndReason } from '@/generated/prisma/client';

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
const WORKSPACE_SELECT_REDIRECT = '/select-workspace';
const WORKSPACE_CREATE_REDIRECT = '/create-workspace';
const PAYMENT_REDIRECT = '/payment';
const VERIFY_PHONE_REDIRECT = '/verify-phone';

export type WorkspaceMembershipSnapshot = {
  id: string;
  workspaceId: string;
  roleDefinitionId: string;
  roleKey: string;
  roleSystemKey?: string | null;
  planId?: string | null;
};

export async function buildFinalSessionWorkflow({
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
  return withUnitOfWork(async () => {
    const identityId = identitySession.identityId;
    await expireIdentitySessionsIfNeeded(identityId);

    let workspaceMembership = inputWorkspaceMembership ?? null;

    if (!workspaceMembership && workspaceId) {
      const foundMembership = await findMembership(workspaceId, identityId);

      if (foundMembership) {
        workspaceMembership = {
          id: foundMembership.id,
          workspaceId: foundMembership.workspaceId,
          roleDefinitionId: foundMembership.roleDefinitionId,
          roleKey: foundMembership.roleKey,
          roleSystemKey: foundMembership.roleSystemKey ?? null,
        };
      }
    }

    const workspaceRoleDefinitionId = workspaceMembership?.roleDefinitionId;
    const membershipId = workspaceMembership?.id;

    const { roleIds: platformRoleIds, roleKeys: platformRoleKeys, roleSystemKeys: platformRoleSystemKeys } =
      await getPlatformAccessContext(identityId);

    const permissions = await resolvePermissions({
      identityId,
      workspaceId,
      workspaceRoleDefinitionId,
      platformRoleDefinitionIds: platformRoleIds,
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

    const existingSession = await findActiveSessionByContext({
      identityId,
      workspaceId,
      membershipId,
      deviceFingerprint: identitySession.deviceFingerprint,
    });

    const session =
      existingSession ??
      (await createSession({
        identityId,
        workspaceId,
        membershipId,
        workspaceRoleDefinitionId,
        workspaceRoleKey: workspaceMembership?.roleKey,
        workspaceRoleSystemKey: workspaceMembership?.roleSystemKey ?? undefined,
        ip: identitySession.ip,
        browser: identitySession.browser,
        os: identitySession.os,
        device: identitySession.device,
        deviceId: identitySession.deviceId,
        deviceFingerprint: identitySession.deviceFingerprint,
        userAgent: identitySession.userAgent,
        isActive: true,
        expiresAt: new Date(
          Date.now() + USER_SESSION_LIFETIME_SECONDS * 1000,
        ),
      }));

    if (identitySession.sessionId !== session.id) {
      await endSession(identitySession.sessionId, SessionEndReason.REPLACED);
    }

    return {
      sessionId: session.id,
      identityId,
      customerId,
      workspaceId,
      membershipId,
      workspaceRoleId: workspaceRoleDefinitionId,
      workspaceRoleKey: workspaceMembership?.roleKey,
      workspaceRoleSystemKey:
        (workspaceMembership?.roleSystemKey as WorkspaceRoleSystemKey | undefined) ??
        undefined,
      platformRoleIds,
      platformRoleKeys,
      platformRoleSystemKeys: platformRoleSystemKeys as PlatformRoleSystemKey[],
      platformRoles: platformRoleKeys,
      workspaceRole: workspaceMembership?.roleKey,
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
  });
}

export async function resolveWorkspaceSurfaceRedirect(params: {
  workspaceId: string;
  fallbackPath: '/app' | '/customer';
}) {
  return withUnitOfWork(async () => {
    const workspace = await getWorkspaceById(params.workspaceId);
    const settings = await getWorkspaceSettings(params.workspaceId);
    const strategy = (settings?.settings as { domain?: { strategy?: string } } | undefined)
      ?.domain?.strategy;

    if (strategy === 'free_path') {
      return `/${workspace.slug}${params.fallbackPath}`;
    }

    return params.fallbackPath;
  });
}

function toWorkspaceMembershipSnapshot(
  membership: {
    id: string;
    workspaceId: string;
    roleDefinitionId: string;
    roleKey: string;
    roleSystemKey?: string | null;
  } | null,
): WorkspaceMembershipSnapshot | null {
  if (!membership) {
    return null;
  }

  return {
    id: membership.id,
    workspaceId: membership.workspaceId,
    roleDefinitionId: membership.roleDefinitionId,
    roleKey: membership.roleKey,
    roleSystemKey: membership.roleSystemKey ?? null,
  };
}

async function buildPhoneVerificationResult(params: {
  identityId: string;
  phoneAuthAccountId: string;
  identifier: string;
  name?: string;
}): Promise<PostLoginResult> {
  const existingOtp = await getLatestOtpRequestForAccount(
    params.phoneAuthAccountId,
    OtpPurpose.SIGNUP,
  );

  let verificationId: string;
  let outboxEventId: string | undefined;

  if (existingOtp && !isOtpExpired(existingOtp)) {
    verificationId = existingOtp.verificationId;
  } else {
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

    verificationId = otpResult.verificationId;
    outboxEventId = outboxEvent.id;
  }

  const verificationSession: VerificationSession = {
    verificationId,
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
      outboxEventId,
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
    const platformInvite = await runWithActor(
      {
        actorType: 'system',
        permissions: [],
        isPlatformAdmin: true,
      },
      () => findPlatformInviteByToken(params.auth.inviteToken!),
    );

    if (!platformInvite) {
      throwError(ERR.NOT_FOUND, 'Invalid invite token');
    }

    if (isPlatformInviteExpired(platformInvite)) {
      throwError(ERR.INVALID_INPUT, 'Invite has expired');
    }

    if (platformInvite.status === 'ACCEPTED') {
      if (
        normalizedEmail &&
        platformInvite.email.toLowerCase() !== normalizedEmail
      ) {
        throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
      }

      const existing = await findPlatformMembership(
        params.identityId,
        platformInvite.roleDefinitionId,
      );

      if (existing) {
        return {
          workspaceMembership: null,
          workspaceId: undefined,
          createdPlatformAccess: true,
        };
      }
    }

    if (platformInvite.status !== 'PENDING') {
      throwError(ERR.INVALID_INPUT, 'Invite already used or revoked');
    }

    const invite =
      platformInvite.status === 'PENDING'
        ? await runWithActor(
            {
              actorType: 'system',
              permissions: [],
              isPlatformAdmin: true,
            },
            () => validatePlatformInviteToken(params.auth.inviteToken!),
          )
        : platformInvite;

    await runWithActor(
      {
        actorType: 'system',
        permissions: [],
        isPlatformAdmin: true,
      },
      async () => {
        if (normalizedEmail && invite.email.toLowerCase() !== normalizedEmail) {
          throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
        }

        const existingByRoleDefinition = await findPlatformMembership(
          params.identityId,
          invite.roleDefinitionId,
        );

        if (!existingByRoleDefinition) {
          await createPlatformMembership({
            identityId: params.identityId,
            roleDefinitionId: invite.roleDefinitionId,
            roleKey: invite.roleKey,
            roleSystemKey:
              (invite.roleSystemKey as PlatformRoleSystemKey | null | undefined) ??
              undefined,
          });
        }

        await acceptPlatformInvite(invite.id);
      },
    );

    return {
      workspaceMembership: null,
      workspaceId: undefined,
      createdPlatformAccess: true,
    };
  }

  const storedInvite = await runWithActor(
    {
      actorType: 'system',
      permissions: [],
      isPlatformAdmin: true,
    },
    () => findInviteByToken(params.auth.inviteToken!),
  );

  if (!storedInvite) {
    throwError(ERR.NOT_FOUND, 'Invalid invite token');
  }

  if (isInviteExpired(storedInvite)) {
    throwError(ERR.INVALID_INPUT, 'Invite has expired');
  }

  if (storedInvite.status === 'ACCEPTED') {
    if (normalizedEmail && storedInvite.email.toLowerCase() !== normalizedEmail) {
      throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
    }

    const existingMembership = await findMembership(
      storedInvite.workspaceId,
      params.identityId,
    );

    if (existingMembership) {
      return {
        workspaceMembership: toWorkspaceMembershipSnapshot(existingMembership),
        workspaceId: storedInvite.workspaceId,
        createdPlatformAccess: false,
      };
    }
  }

  if (storedInvite.status !== 'PENDING') {
    throwError(ERR.INVALID_INPUT, 'Invite already used or revoked');
  }

  const invite =
    storedInvite.status === 'PENDING'
      ? await runWithActor(
          {
            actorType: 'system',
            permissions: [],
            isPlatformAdmin: true,
          },
          () => validateInviteToken(params.auth.inviteToken!),
        )
      : storedInvite;

  const workspaceMembership = await runWithActor(
    {
      actorType: 'system',
      permissions: [],
      isPlatformAdmin: true,
    },
    async () => {
      if (normalizedEmail && invite.email.toLowerCase() !== normalizedEmail) {
        throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
      }

      const existingMembership = await findMembership(
        invite.workspaceId,
        params.identityId,
      );

      if (existingMembership) {
        await acceptInvite(invite.id);
        return existingMembership;
      }

      const createdMembership = await createMembership({
        identityId: params.identityId,
        workspaceId: invite.workspaceId,
        roleDefinitionId: invite.roleDefinitionId,
        roleKey: invite.roleKey,
        roleSystemKey:
          (invite.roleSystemKey as WorkspaceRoleSystemKey | null | undefined) ??
          undefined,
      });

      await acceptInvite(invite.id);

      return createdMembership;
    },
  );

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

    const { roleKeys: platformRoles } = await getPlatformAccessContext(identityId);
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

    if (
      auth.flow === 'signup' &&
      auth.mode === 'normal' &&
      auth.entry === 'platform'
    ) {
      if (requestedWorkspaceId && requestedWorkspaceMembership) {
        const finalSession = await buildFinalSessionWorkflow({
          identitySession,
          workspaceId: requestedWorkspaceId,
          workspaceMembership: requestedWorkspaceMembership,
        });

        return {
          finalSession,
          redirectTo: await resolveWorkspaceSurfaceRedirect({
            workspaceId: requestedWorkspaceId,
            fallbackPath: '/app',
          }),
        };
      }

      if (requestedWorkspaceId && !requestedWorkspaceMembership) {
        throwError(ERR.INVALID_STATE, 'Workspace owner membership missing');
      }

      if (auth.intent === 'paid') {
        return {
          nextStep: 'finalize',
          redirectTo: PAYMENT_REDIRECT,
        };
      }

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
        redirectTo: await resolveWorkspaceSurfaceRedirect({
          workspaceId: auth.workspaceId,
          fallbackPath: '/customer',
        }),
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
        redirectTo: await resolveWorkspaceSurfaceRedirect({
          workspaceId: requestedWorkspaceId,
          fallbackPath: '/app',
        }),
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
          redirectTo: await resolveWorkspaceSurfaceRedirect({
            workspaceId: requestedWorkspaceId,
            fallbackPath: '/customer',
          }),
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
          redirectTo: await resolveWorkspaceSurfaceRedirect({
            workspaceId: requestedWorkspaceId,
            fallbackPath: '/app',
          }),
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
          redirectTo: await resolveWorkspaceSurfaceRedirect({
            workspaceId: memberships[0].workspaceId,
            fallbackPath: '/app',
          }),
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
          redirectTo: await resolveWorkspaceSurfaceRedirect({
            workspaceId: firstCustomer.workspaceId,
            fallbackPath: '/customer',
          }),
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
        redirectTo: await resolveWorkspaceSurfaceRedirect({
          workspaceId: memberships[0].workspaceId,
          fallbackPath: '/app',
        }),
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
        redirectTo: await resolveWorkspaceSurfaceRedirect({
          workspaceId: firstCustomer.workspaceId,
          fallbackPath: '/customer',
        }),
      };
    }

    return {
      nextStep: 'workspace_create',
      redirectTo: WORKSPACE_CREATE_REDIRECT,
    };
  });
}
