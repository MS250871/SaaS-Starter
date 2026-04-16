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

  if (session.workspaceId) {
    res.headers.set('x-workspace-id', session.workspaceId);
  }

  if (session.membershipId) {
    res.headers.set('x-membership-id', session.membershipId);
  }

  if (session.workspaceRole) {
    res.headers.set('x-workspace-role', session.workspaceRole);
  }

  if (session.platformRoles?.length) {
    res.headers.set('x-platform-roles', JSON.stringify(session.platformRoles));
  }
  if (session.permissions?.length) {
    res.headers.set('x-permissions', JSON.stringify(session.permissions));
  }
}
