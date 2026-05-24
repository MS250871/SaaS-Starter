import {
  sessionPayloadSchema,
  type SessionClaims,
} from '@/lib/auth/auth.schema';

function readJsonArray(raw: string | null) {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return undefined;
  }
}

export function readSessionClaimsFromHeaders(
  getHeader: (name: string) => string | null,
): SessionClaims | null {
  const sessionId = getHeader('x-session-id');

  if (!sessionId) {
    return null;
  }

  const platformRoleKeys = readJsonArray(getHeader('x-platform-role-keys'));
  const legacyPlatformRoles = readJsonArray(getHeader('x-platform-roles'));
  const parsed = sessionPayloadSchema.safeParse({
    sessionId,
    identityId: getHeader('x-identity-id') ?? undefined,
    identityFirstName: getHeader('x-identity-first-name') ?? undefined,
    identityLastName: getHeader('x-identity-last-name') ?? undefined,
    identityEmail: getHeader('x-identity-email') ?? undefined,
    customerId: getHeader('x-customer-id') ?? undefined,
    workspaceId: getHeader('x-workspace-id') ?? undefined,
    workspaceName: getHeader('x-workspace-name') ?? undefined,
    membershipId: getHeader('x-membership-id') ?? undefined,
    workspaceRoleId: getHeader('x-workspace-role-id') ?? undefined,
    workspaceRoleKey:
      getHeader('x-workspace-role-key') ??
      getHeader('x-workspace-role') ??
      undefined,
    workspaceRoleSystemKey:
      getHeader('x-workspace-role-system-key') ?? undefined,
    platformRoleIds: readJsonArray(getHeader('x-platform-role-ids')),
    platformRoleKeys:
      (platformRoleKeys?.length ?? 0) > 0
        ? platformRoleKeys
        : legacyPlatformRoles,
    platformRoleSystemKeys: readJsonArray(
      getHeader('x-platform-role-system-keys'),
    ),
    platformRoles: legacyPlatformRoles,
    workspaceRole: getHeader('x-workspace-role') ?? undefined,
    ip: getHeader('x-ip') ?? undefined,
    browser: getHeader('x-browser') ?? undefined,
    os: getHeader('x-os') ?? undefined,
    device: getHeader('x-device') ?? undefined,
    deviceId: getHeader('x-device-id') ?? undefined,
    deviceFingerprint: getHeader('x-device-fingerprint') ?? undefined,
    userAgent: getHeader('x-user-agent') ?? undefined,
    isActive: getHeader('x-session-active') !== 'false',
    createdAt: Number(getHeader('x-session-created-at') ?? Date.now()),
    expiresAt: Number(getHeader('x-session-expires-at') ?? 0),
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
