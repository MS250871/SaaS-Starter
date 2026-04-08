import { z } from 'zod';

const enumWorkspaceRole = z.enum(['OWNER', 'ADMIN', 'STAFF', 'VIEWER']);

const enumPlatformRole = z.enum([
  'PLATFORM_ADMIN',
  'BILLING_AGENT',
  'SUPPORT_AGENT',
  'PLATFORM_STAFF',
]);

const enumOtpPurpose = z.enum([
  'LOGIN',
  'SIGNUP',
  'INVITE',
  'PASSWORD_RESET',
  'MFA',
]);

/* =========================================================
   AUTH FLOW COOKIE
========================================================= */

export const authCookiesSchema = z.object({
  flow: z.enum(['signup', 'login']),
  intent: z.enum(['free', 'paid']).optional(),
  entry: z.enum(['platform', 'workspace', 'invite']),
  inviteToken: z.string().optional(),
  workspaceId: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type AuthCookies = z.infer<typeof authCookiesSchema>;

/* =========================================================
   VERIFICATION SESSION
========================================================= */

export const verificationSessionSchema = z.object({
  verificationId: z.string(),
  authAccountId: z.string(),
  otpPurpose: enumOtpPurpose,

  mode: z.enum(['email', 'phone']),
  step: z.enum(['email', 'phone', 'done']),

  identityId: z.string(),

  identifier: z.string(),

  createdAt: z.number(),
});

export type VerificationSession = z.infer<typeof verificationSessionSchema>;

/* =========================================================
   USER SESSION (ACTOR SNAPSHOT)
========================================================= */

export const sessionPayloadSchema = z.object({
  sessionId: z.string(),

  identityId: z.string(),

  workspaceId: z.string().optional(),
  membershipId: z.string().optional(),

  platformRole: enumPlatformRole.optional(),
  workspaceRole: enumWorkspaceRole.optional(),

  ip: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
  deviceId: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  userAgent: z.string().optional(),

  isActive: z.boolean(),

  permissions: z.array(z.string()),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number()),

  createdAt: z.number(),
  expiresAt: z.number(),

  version: z.number().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/* =========================================================
   DEVICE ID
========================================================= */

export const deviceIdSchema = z.string().min(10);

export type DeviceId = z.infer<typeof deviceIdSchema>;
