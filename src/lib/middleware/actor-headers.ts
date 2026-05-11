import { NextResponse } from 'next/server';
import type { SessionPayload } from '@/lib/auth/auth.schema';

export function injectActorHeaders(
  res: NextResponse,
  session: SessionPayload | null,
) {
  if (!session) return;

  res.headers.set('x-session-id', session.sessionId);

  if (session.identityId) {
    res.headers.set('x-identity-id', session.identityId);
  }

  if (session.customerId) {
    res.headers.set('x-customer-id', session.customerId);
  }

  if (session.workspaceId) {
    res.headers.set('x-workspace-id', session.workspaceId);
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
  if (session.permissions?.length) {
    res.headers.set('x-permissions', JSON.stringify(session.permissions));
  }
}
