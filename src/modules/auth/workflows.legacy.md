# Auth Workflows Legacy Snapshot

Comparison-only snapshot captured from `git show HEAD:src/modules/auth/workflows.ts` before the auth folder refactor.

Current extracted files to compare against:
- `src/modules/auth/workflows/signup.workflow.ts`
- `src/modules/auth/workflows/login.workflow.ts`
- `src/modules/auth/workflows/verify.workflow.ts`
- `src/modules/auth/workflows/resend.workflow.ts`
- `src/modules/auth/workflows.ts`

```ts
import type { LoginDomain, SignupDomain } from '@/modules/auth/schema';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import {
  findAuthAccountByIdentifier,
  createAuthAccountForIdentity,
} from '@/modules/auth/services/authAccount.services';
import {
  acceptInvite,
  validateInviteToken,
} from '../workspace/services/invite.services';
import {
  createIdentity,
  getIdentityById,
} from '@/modules/auth/services/identity.services';
import { generateOtp, resendOtp } from '@/modules/auth/services/otp.services';
import { verifyOtp } from '@/modules/auth/services/otp.services';
import { verifyAuthAccount } from '@/modules/auth/services/authAccount.services';
import { createSession } from '@/modules/auth/services/session.services';
import { AuthAccountType, OtpPurpose } from '@/generated/prisma/client';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { emailSchema } from '@/modules/auth/schema';
import {
  AuthCookies,
  SessionPayload,
  VerificationSession,
} from '@/lib/auth/auth.schema';
import { getRequestContext } from '@/lib/context/request-context';
import { createFingerprint } from '@/lib/auth/auth-utils';
import {
  createMembership,
  findMembership,
  listIdentityMemberships,
} from '../workspace/services/membership.services';
import { createWorkspace } from '../workspace/services/workspace.services';
import { resolvePermissions } from '../permissions/permissions.services';
import { resolveEntitlements } from '../entitlements/entitlement.services';
import {
  acceptPlatformInvite,
  validatePlatformInviteToken,
} from '../platform/services/invite,services';
import {
  createPlatformMembership,
  findPlatformMembership,
  getPlatformAccessContext,
  getPlatformMembershipById,
  getPlatformRoles,
} from '../platform/services/membership.services';
import { WorkspaceRole, PlatformRole } from '@/generated/prisma/client';
import { getCustomerByIdentityId } from './services/customer.services';

type AuthStep =
  | 'verify_phone'
  | 'payment'
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
      };

      finalSession?: never;
    }
  | {
      finalSession: SessionPayload;
      redirectTo?: string;

      nextStep?: never;
      meta?: never;
    };

type ResolveNextStepInput = {
  flow: 'signup' | 'login';
  entry: 'platform' | 'workspace';
  mode: 'normal' | 'invite';
  intent?: 'free' | 'paid';

  // runtime signals
  isPhoneVerified?: boolean;
  hasWorkspace?: boolean;
  workspaceCount?: number;
  hasPlatformAccess?: boolean;
  isCustomer?: boolean;
};

export async function signupWorkflow(input: SignupDomain) {
  return withUnitOfWork(async () => {
    /*------------------------VALIDATE INVITE------------------------*/
    if (input.inviteToken) {
      const invite = await validateInviteToken(input.inviteToken);

      // optional email enforcement
      if (invite.email && invite.email !== input.email) {
        throwError(ERR.INVALID_INPUT, 'Email does not match invite');
      }
    }

    /*------------------------CHECK EXISTING USER------------------------*/
    const existingEmail = await findAuthAccountByIdentifier(input.email);

    const OtpPurposeToUse = input.inviteToken
      ? OtpPurpose.INVITE
      : OtpPurpose.SIGNUP;

    if (existingEmail) {
      if (existingEmail.isVerified) {
        if (input.inviteToken) {
          /*------------------------GENERATE OTP------------------------*/
          const otpResult = await generateOtp({
            authAccountId: existingEmail.id,
            otpPurpose: OtpPurpose.INVITE,
          });

          /*------------------------RESPONSE------------------------*/
          return {
            verificationId: otpResult.verificationId,
            authAccountId: existingEmail.id,
            otpPurpose: OtpPurpose.INVITE,
            otp: otpResult.otp,
            identityId: existingEmail.identityId,
            name: input.firstName
              ? `${input.firstName} ${input.lastName}`
              : existingEmail.value, // fallback
            mode: 'email' as const,
            step: 'email' as const,
            identifier: existingEmail.value,
            createdAt: Date.now(),
          };
        }
        throwError(ERR.ALREADY_EXISTS, 'Email already registered', 409, {
          email: 'Email already registered',
        });
      } else {
        /*------------------------GENERATE OTP------------------------*/
        const otpResult = await generateOtp({
          authAccountId: existingEmail.id,
          otpPurpose: OtpPurposeToUse,
        });

        /*------------------------RESPONSE------------------------*/
        return {
          verificationId: otpResult.verificationId,
          authAccountId: existingEmail.id,
          otpPurpose: OtpPurposeToUse,
          otp: otpResult.otp,
          identityId: existingEmail.identityId,
          name: input.firstName
            ? `${input.firstName} ${input.lastName}`
            : existingEmail.value, // fallback
          mode: 'email' as const,
          step: 'email' as const,
          identifier: existingEmail.value,
          createdAt: Date.now(),
        };
      }
    }

    /*------------------------CREATE IDENTITY------------------------*/
    const identity = await createIdentity({
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: true,
    });

    /*------------------------CREATE AUTH ACCOUNTS (EMAIL/PHONE)------------------------*/
    const emailAccount = await createAuthAccountForIdentity(
      identity.id,
      AuthAccountType.EMAIL,
      input.email,
    );

    await createAuthAccountForIdentity(
      identity.id,
      AuthAccountType.PHONE,
      String(input.phone),
    );

    /*------------------------GENERATE OTP------------------------*/
    const otpResult = await generateOtp({
      authAccountId: emailAccount.id,
      otpPurpose: OtpPurposeToUse,
    });

    /*------------------------RESPONSE------------------------*/
    return {
      verificationId: otpResult.verificationId,
      authAccountId: emailAccount.id,
      otpPurpose: OtpPurposeToUse,
      mode: 'email' as const,
      step: 'email' as const,
      identityId: identity.id,
      identifier: input.email,
      createdAt: Date.now(),
      otp: otpResult.otp,
      name: input.firstName
        ? `${input.firstName} ${input.lastName}`
        : input.email,
    };
  });
}

export async function loginWorkflow(input: LoginDomain) {
  const isEmail = emailSchema.safeParse(input.identifier).success;
  /*------------------------CHECK USER------------------------*/
  const existing = await findAuthAccountByIdentifier(input.identifier);

  if (!existing.isVerified) {
    throwError(ERR.INVALID_INPUT, 'Account not verified yet');
  }

  const identity = await getIdentityById(existing.identityId);

  /*------------------------GENERATE OTP------------------------*/
  const otpResult = await generateOtp({
    authAccountId: existing.id,
    otpPurpose: OtpPurpose.LOGIN,
  });

  /*------------------------RESPONSE------------------------*/
  return {
    verificationId: otpResult.verificationId,
    authAccountId: existing.id,
    otpPurpose: OtpPurpose.LOGIN,
    mode: isEmail ? ('email' as const) : ('phone' as const),
    step: 'done' as const,
    identityId: existing.identityId,
    identifier: existing.value,
    createdAt: Date.now(),
    otp: otpResult.otp,
    name: identity
      ? `${identity.firstName} ${identity.lastName}`
      : existing.value,
  };
}

export async function verifyWorkflow(input: {
  otp: string;
  verificationSession: VerificationSession;
}) {
  return withUnitOfWork(async () => {
    const { otp, verificationSession } = input;

    const reqContext = getRequestContext();
    const deviceFingerprint = createFingerprint(reqContext);

    /* ---------------- VERIFY OTP ---------------- */
    await verifyOtp({
      verificationId: verificationSession.verificationId,
      otp,
    });

    /* ---------------- MARK ACCOUNT VERIFIED ---------------- */
    if (
      verificationSession.otpPurpose === OtpPurpose.SIGNUP ||
      verificationSession.otpPurpose === OtpPurpose.INVITE
    ) {
      await verifyAuthAccount(verificationSession.authAccountId);
    }

    /* ---------------- CREATE SESSION ---------------- */
    const identitySession = {
      identityId: verificationSession.identityId,
      ip: reqContext.ip,
      browser: reqContext.browser,
      os: reqContext.os,
      device: reqContext.device,
      deviceId: reqContext.deviceId,
      deviceFingerprint: deviceFingerprint,
      userAgent: reqContext.userAgent,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 mins, can be adjusted
    };

    const session = await createSession(identitySession);

    /* ---------------- BUILD SESSION COOKIE PAYLOAD ---------------- */
    const payload: SessionPayload = {
      sessionId: session.id,
      identityId: session.identityId,

      workspaceId: session.workspaceId ?? undefined,
      membershipId: session.membershipId ?? undefined,

      platformRoles: [], // empty for identity session
      workspaceRole: session.workspaceRole ?? undefined,

      ip: session.ip ?? undefined,
      browser: session.browser ?? undefined,
      os: session.os ?? undefined,
      device: session.device ?? undefined,
      deviceId: session.deviceId ?? undefined,
      deviceFingerprint: session.deviceFingerprint ?? undefined,
      userAgent: session.userAgent ?? undefined,

      isActive: session.isActive,

      permissions: [], // empty for identity session
      features: [],
      limits: {},

      createdAt: session.createdAt.getTime(),
      expiresAt: session.expiresAt.getTime(),
    };

    /* ---------------- RETURN ---------------- */
    return payload;
  });
}

export async function resendOtpWorkflow(input: {
  verificationSession: VerificationSession;
}) {
  return withUnitOfWork(async () => {
    const { verificationSession } = input;

    const SESSION_TTL = 15 * 60 * 1000;

    if (Date.now() - verificationSession.createdAt > SESSION_TTL) {
      throwError(ERR.TOKEN_EXPIRED, 'Verification session expired');
    }

    const identity = await getIdentityById(verificationSession.identityId);

    const result = await resendOtp({
      verificationId: verificationSession.verificationId,
    });

    /* ---------------- RETURN ---------------- */
    return {
      otp: result.otp,
      identifier: verificationSession.identifier,
      name: identity
        ? `${identity.firstName} ${identity.lastName}`
        : verificationSession.identifier,
    };
  });
}

export async function buildFinalSessionWorkflow({
  identitySession,
  workspaceId,
  workspaceMembership: inputWorkspaceMembership,
}: {
  identitySession: SessionPayload;

  workspaceId?: string;

  workspaceMembership?: {
    id: string;
    role: WorkspaceRole;
    planId?: string | null;
  } | null;
}): Promise<SessionPayload> {
  const identityId = identitySession.identityId;

  /* =========================================================
     WORKSPACE MEMBERSHIP
  ========================================================= */

  let workspaceMembership = inputWorkspaceMembership ?? null;

  if (!workspaceMembership && workspaceId) {
    workspaceMembership = await findMembership(identityId, workspaceId);
  }

  const workspaceRole = workspaceMembership?.role;
  const membershipId = workspaceMembership?.id;

  /* =========================================================
     PLATFORM ROLES (MULTI)
  ========================================================= */

  const { roles: platformRoles } = await getPlatformAccessContext(identityId);

  /* =========================================================
     PERMISSIONS
  ========================================================= */

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

  /* =========================================================
     CREATE SESSION
  ========================================================= */

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

  /* =========================================================
     PAYLOAD
  ========================================================= */

  return {
    sessionId: session.id,
    identityId,

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

export function resolveEffectiveStep(input: ResolveNextStepInput) {
  // ALLOWS OVERRIDES FOR SPECIAL CASES (E.G. PAYMENT, ONBOARDING) BEFORE FALLING BACK TO DEFAULT RESOLUTION
  // Payment override (future)
  // const payment = await getPendingPayment(input.identityId);
  // if (payment) {
  //   return {
  //     step: 'payment',
  //     redirectTo: '/payment',
  //   };
  // }

  // // Onboarding override (future)
  // const onboarding = await getOnboardingProgress(input.identityId);
  // if (onboarding && !onboarding.completed) {
  //   return {
  //     step: 'onboarding',
  //     redirectTo: '/onboarding',
  //   };
  // }

  /* ---------------- DEFAULT ---------------- */

  return resolveAuthStep(input);
}

export function resolveAuthStep(input: ResolveNextStepInput): {
  nextStep?: AuthStep;
  redirectTo?: string;
} {
  const {
    flow,
    entry,
    mode,
    intent,
    isPhoneVerified,
    workspaceCount = 0,
    hasPlatformAccess = false,
    isCustomer = false,
  } = input;

  /* =========================================================
     SIGNUP FLOW
  ========================================================= */

  if (flow === 'signup') {
    /* ---------------- INVITE MODE ---------------- */

    if (mode === 'invite') {
      if (!isPhoneVerified) {
        return {
          nextStep: 'verify_phone',
          redirectTo: '/verify-otp?mode=phone',
        };
      }

      // Invite → directly finalize (no payment, no workspace creation)

      if (entry === 'platform') {
        return {
          nextStep: 'finalize',
          redirectTo: '/platform',
        };
      }

      if (entry === 'workspace') {
        return {
          nextStep: 'finalize',
          redirectTo: '/app',
        };
      }
    }

    /* ---------------- NORMAL SIGNUP ---------------- */

    if (!isPhoneVerified) {
      return {
        nextStep: 'verify_phone',
        redirectTo: '/verify-otp?mode=phone',
      };
    }

    if (entry === 'platform' && intent === 'paid') {
      return {
        nextStep: 'payment',
        redirectTo: '/payment',
      };
    }

    if (entry === 'platform') {
      return {
        nextStep: 'workspace_create',
        redirectTo: '/create-workspace',
      };
    }

    // workspace entry (direct signup)
    return {
      nextStep: 'finalize',
      redirectTo: '/app',
    };
  }

  /* =========================================================
     LOGIN FLOW
  ========================================================= */

  if (flow === 'login') {
    if (workspaceCount > 1) {
      return {
        nextStep: 'workspace_select',
        redirectTo: '/select-workspace',
      };
    }

    /* ---------------- SURFACE RESOLUTION ---------------- */

    if (hasPlatformAccess) {
      return {
        nextStep: 'finalize',
        redirectTo: '/platform',
      };
    }

    if (workspaceCount === 1) {
      return {
        nextStep: 'finalize',
        redirectTo: '/app',
      };
    }

    if (isCustomer) {
      return {
        nextStep: 'finalize',
        redirectTo: '/customer',
      };
    }

    return {
      nextStep: 'workspace_create',
      redirectTo: '/create-workspace',
    };
  }

  return {};
}

export async function postLoginWorkflow(input: {
  identitySession: SessionPayload;
  auth: AuthCookies;
}): Promise<PostLoginResult> {
  return withUnitOfWork(async () => {
    const { identitySession, auth } = input;

    const identityId = identitySession.identityId;
    const identity = await getIdentityById(identityId);
    const phoneAuthAccount = await findAuthAccountByIdentifier(
      identity?.phone!,
    );

    const { roles: platformRoles } = await getPlatformAccessContext(identityId);

    const memberships = await listIdentityMemberships(identityId);

    const customer = await getCustomerByIdentityId(identityId);

    /* =========================================================
       INVITE FLOW - Handles membersship and invite acceptance first
    ========================================================= */

    if (auth.mode === 'invite' && auth.inviteToken) {
      /* ---------------- WORKSPACE INVITE ---------------- */

      if (auth.entry === 'workspace' && auth.workspaceId) {
        const invite = await validateInviteToken(auth.inviteToken);

        if (invite.email !== identity.email) {
          throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
        }

        let workspaceMembership = await findMembership(
          identityId,
          invite.workspaceId,
        );

        if (!workspaceMembership) {
          workspaceMembership = await createMembership({
            identityId,
            workspaceId: invite.workspaceId,
            role: invite.role,
          });
        }

        await acceptInvite(invite.id);
      }

      /* ---------------- PLATFORM INVITE ---------------- */

      if (auth.entry === 'platform') {
        const invite = await validatePlatformInviteToken(auth.inviteToken);

        if (invite.email !== identity.email) {
          throwError(ERR.UNAUTHORIZED, 'Invite email mismatch');
        }

        const existing = await findPlatformMembership(identityId, invite.role);

        if (!existing) {
          await createPlatformMembership({
            identityId,
            role: invite.role,
          });
        }

        await acceptPlatformInvite(invite.id);
      }
    }

    /* =========================================================
       RESOLVE STEP (CORE ENGINE)
    ========================================================= */

    const stepResult = resolveEffectiveStep({
      flow: auth.flow,
      entry: auth.entry,
      mode: auth.mode,
      intent: auth.intent,

      isPhoneVerified: !!phoneAuthAccount?.isVerified,
      workspaceCount: memberships.length,
      hasPlatformAccess: platformRoles.length > 0,
      isCustomer: !!customer,
    });

    const step = stepResult.nextStep;

    /* =========================================================
       STEP EXECUTION
    ========================================================= */

    /* ---------------- VERIFY PHONE ---------------- */

    if (step === 'verify_phone') {
      if (!phoneAuthAccount) {
        throwError(ERR.UNAUTHORIZED, 'Phone auth account not found');
      }

      const otpResult = await generateOtp({
        authAccountId: phoneAuthAccount.id,
        otpPurpose: OtpPurpose.SIGNUP,
      });

      const verificationSession: VerificationSession = {
        verificationId: otpResult.verificationId,
        authAccountId: phoneAuthAccount.id,
        otpPurpose: OtpPurpose.SIGNUP,
        mode: 'phone',
        step: 'phone',
        identityId,
        identifier: phoneAuthAccount.value,
        createdAt: Date.now(),
      };

      return {
        redirectTo: '/verify-otp?mode=phone',
        meta: {
          verificationSession,
          otp: otpResult.otp,
        },
      };
    }

    /* ---------------- PAYMENT ---------------- */

    if (step === 'payment') {
      return {
        redirectTo: '/payment',
      };
    }

    /* ---------------- WORKSPACE CREATE ---------------- */

    if (step === 'workspace_create') {
      const workspace = await createWorkspace({
        ownerId: identityId,
      });

      const membership = await createMembership({
        identityId,
        workspaceId: workspace.id,
        role: 'OWNER',
      });

      const session = await buildFinalSessionWorkflow({
        identitySession,
        workspaceId: workspace.id,
        workspaceMembership: membership,
      });

      return {
        finalSession: session,
        redirectTo: '/app',
      };
    }

    /* ---------------- WORKSPACE SELECT ---------------- */

    if (step === 'workspace_select') {
      return {
        redirectTo: '/select-workspace',
      };
    }

    /* ---------------- FINALIZE ---------------- */

    if (step === 'finalize') {
      let workspaceId: string | undefined;
      let membership = null;

      if (memberships.length === 1) {
        membership = memberships[0];
        workspaceId = membership.workspaceId;
      }

      const session = await buildFinalSessionWorkflow({
        identitySession,
        workspaceId,
        workspaceMembership: membership,
      });

      const redirectTo =
        stepResult.redirectTo ??
        (platformRoles.length > 0 ? '/platform' : '/app');

      return {
        finalSession: session,
        redirectTo,
      };
    }

    throwError(ERR.INVALID_STATE, 'Unhandled step');
  });
}
```
