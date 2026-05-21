import { NextResponse } from 'next/server';
import type { SessionClaims, SessionPayload } from '@/lib/auth/auth.schema';

export function injectActorHeaders(
  res: NextResponse,
  session: SessionClaims | SessionPayload | null,
) {
  if (!session) return;

  res.headers.set('x-session-id', session.sessionId);
  res.headers.set('x-session-created-at', String(session.createdAt));
  res.headers.set('x-session-expires-at', String(session.expiresAt));
  res.headers.set('x-session-active', String(session.isActive));

  if (typeof session.version === 'number') {
    res.headers.set('x-session-version', String(session.version));
  }

  if (session.identityId) {
    res.headers.set('x-identity-id', session.identityId);
  }

  if (session.identityFirstName) {
    res.headers.set('x-identity-first-name', session.identityFirstName);
  }

  if (session.identityLastName) {
    res.headers.set('x-identity-last-name', session.identityLastName);
  }

  if (session.identityEmail) {
    res.headers.set('x-identity-email', session.identityEmail);
  }

  if (session.customerId) {
    res.headers.set('x-customer-id', session.customerId);
  }

  if (session.workspaceId) {
    res.headers.set('x-workspace-id', session.workspaceId);
  }

  if (session.workspaceName) {
    res.headers.set('x-workspace-name', session.workspaceName);
  }

  if (session.membershipId) {
    res.headers.set('x-membership-id', session.membershipId);
  }

  if (session.workspaceRoleId) {
    res.headers.set('x-workspace-role-id', session.workspaceRoleId);
  }

  if (session.workspaceRoleKey) {
    res.headers.set('x-workspace-role-key', session.workspaceRoleKey);
  }

  if (session.workspaceRoleSystemKey) {
    res.headers.set('x-workspace-role-system-key', session.workspaceRoleSystemKey);
  }

  if (session.workspaceRole) {
    res.headers.set('x-workspace-role', session.workspaceRole);
  }

  if (session.ip) {
    res.headers.set('x-ip', session.ip);
  }

  if (session.browser) {
    res.headers.set('x-browser', session.browser);
  }

  if (session.os) {
    res.headers.set('x-os', session.os);
  }

  if (session.device) {
    res.headers.set('x-device', session.device);
  }

  if (session.deviceId) {
    res.headers.set('x-device-id', session.deviceId);
  }

  if (session.deviceFingerprint) {
    res.headers.set('x-device-fingerprint', session.deviceFingerprint);
  }

  if (session.userAgent) {
    res.headers.set('x-user-agent', session.userAgent);
  }

  if (session.platformRoleIds?.length) {
    res.headers.set('x-platform-role-ids', JSON.stringify(session.platformRoleIds));
  }

  if (session.platformRoleKeys?.length) {
    res.headers.set('x-platform-role-keys', JSON.stringify(session.platformRoleKeys));
  }

  if (session.platformRoleSystemKeys?.length) {
    res.headers.set(
      'x-platform-role-system-keys',
      JSON.stringify(session.platformRoleSystemKeys),
    );
  }

  if (session.platformRoles?.length) {
    res.headers.set('x-platform-role', session.platformRoles[0]);
    res.headers.set('x-platform-roles', JSON.stringify(session.platformRoles));
  } else if (session.platformRoleKeys?.length) {
    res.headers.set('x-platform-role', session.platformRoleKeys[0]);
    res.headers.set('x-platform-roles', JSON.stringify(session.platformRoleKeys));
  }
}
