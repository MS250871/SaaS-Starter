import { NextResponse } from 'next/server';
import type { SessionPayload } from '@/lib/auth/auth-cookies';

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

  if (session.workspaceRole) {
    res.headers.set('x-workspace-role', session.workspaceRole);
  }

  if (session.platformRole) {
    res.headers.set('x-platform-role', session.platformRole);
  }
  if (session.permissions?.length) {
    res.headers.set('x-permissions', JSON.stringify(session.permissions));
  }
}
