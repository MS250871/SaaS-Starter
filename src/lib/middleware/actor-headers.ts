import type { SessionClaims, SessionPayload } from '@/lib/auth/auth.schema';

export function injectActorHeaders(
  headers: Headers,
  session: SessionClaims | SessionPayload | null,
) {
  if (!session) return;

  headers.set('x-session-id', session.sessionId);
  headers.set('x-session-created-at', String(session.createdAt));
  headers.set('x-session-expires-at', String(session.expiresAt));
  headers.set('x-session-active', String(session.isActive));

  if (session.identityId) {
    headers.set('x-identity-id', session.identityId);
  }

  if (session.identityFirstName) {
    headers.set('x-identity-first-name', session.identityFirstName);
  }

  if (session.identityLastName) {
    headers.set('x-identity-last-name', session.identityLastName);
  }

  if (session.identityEmail) {
    headers.set('x-identity-email', session.identityEmail);
  }

  if (session.customerId) {
    headers.set('x-customer-id', session.customerId);
  }

  if (session.workspaceId) {
    headers.set('x-workspace-id', session.workspaceId);
  }

  if (session.workspaceName) {
    headers.set('x-workspace-name', session.workspaceName);
  }

  if (session.membershipId) {
    headers.set('x-membership-id', session.membershipId);
  }

  if (session.workspaceRoleId) {
    headers.set('x-workspace-role-id', session.workspaceRoleId);
  }

  if (session.workspaceRoleKey) {
    headers.set('x-workspace-role-key', session.workspaceRoleKey);
  }

  if (session.workspaceRoleSystemKey) {
    headers.set('x-workspace-role-system-key', session.workspaceRoleSystemKey);
  }

  if (session.workspaceRole) {
    headers.set('x-workspace-role', session.workspaceRole);
  }

  if (session.ip) {
    headers.set('x-ip', session.ip);
  }

  if (session.browser) {
    headers.set('x-browser', session.browser);
  }

  if (session.os) {
    headers.set('x-os', session.os);
  }

  if (session.device) {
    headers.set('x-device', session.device);
  }

  if (session.deviceId) {
    headers.set('x-device-id', session.deviceId);
  }

  if (session.deviceFingerprint) {
    headers.set('x-device-fingerprint', session.deviceFingerprint);
  }

  if (session.userAgent) {
    headers.set('x-user-agent', session.userAgent);
  }

  if (session.platformRoleIds?.length) {
    headers.set('x-platform-role-ids', JSON.stringify(session.platformRoleIds));
  }

  if (session.platformRoleKeys?.length) {
    headers.set('x-platform-role-keys', JSON.stringify(session.platformRoleKeys));
  }

  if (session.platformRoleSystemKeys?.length) {
    headers.set(
      'x-platform-role-system-keys',
      JSON.stringify(session.platformRoleSystemKeys),
    );
  }

  if (session.platformRoles?.length) {
    headers.set('x-platform-role', session.platformRoles[0]);
    headers.set('x-platform-roles', JSON.stringify(session.platformRoles));
  } else if (session.platformRoleKeys?.length) {
    headers.set('x-platform-role', session.platformRoleKeys[0]);
    headers.set('x-platform-roles', JSON.stringify(session.platformRoleKeys));
  }
}
