import { z } from 'zod';
import {
  platformRoleSystemKeySchema,
  workspaceRoleSystemKeySchema,
} from '@/modules/roles/role.types';

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

  entry: z.enum(['platform', 'workspace']),
  mode: z.enum(['normal', 'invite']).default('normal'),

  channel: z.enum(['web', 'mobile', 'api', 'oauth']).default('web'),

  intent: z.enum(['free', 'paid']).optional(),
  planKey: z.string().optional(),
  planName: z.string().optional(),

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
  nextPath: z.string().optional(),

  createdAt: z.number(),
});

export type VerificationSession = z.infer<typeof verificationSessionSchema>;

/* =========================================================
   USER SESSION (ACTOR SNAPSHOT)
========================================================= */

export const sessionPayloadSchema = z.object({
  sessionId: z.string(),

  identityId: z.string(),
  customerId: z.string().optional(),

  workspaceId: z.string().optional(),
  membershipId: z.string().optional(),

  workspaceRoleId: z.string().optional(),
  workspaceRoleKey: z.string().optional(),
  workspaceRoleSystemKey: workspaceRoleSystemKeySchema.optional(),

  platformRoleIds: z.array(z.string()).optional(),
  platformRoleKeys: z.array(z.string()).optional(),
  platformRoleSystemKeys: z.array(platformRoleSystemKeySchema).optional(),

  // Compatibility aliases kept during the refactor.
  platformRoles: z.array(z.string()).optional(),
  workspaceRole: z.string().optional(),

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
