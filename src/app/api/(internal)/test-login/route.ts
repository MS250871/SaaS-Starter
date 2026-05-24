import { NextResponse } from 'next/server';
import type { SessionPayload } from '@/lib/auth/auth.schema';
import { setUserSession } from '@/lib/auth/auth-cookies';

export async function GET() {
  const payload: SessionPayload = {
    sessionId: 'sess_test_123',

    identityId: 'identity_1',
    workspaceId: 'ws_123',
    membershipId: 'mem_123',

    workspaceRoleId: 'role_ws_owner',
    workspaceRoleKey: 'owner',
    workspaceRoleSystemKey: 'WORKSPACE_OWNER',
    platformRoleIds: ['role_platform_admin'],
    platformRoleKeys: ['platform-admin'],
    platformRoleSystemKeys: ['PLATFORM_ADMIN'],
    platformRoles: ['platform-admin'],
    workspaceRole: 'owner',

    isActive: true,
    permissions: [],
    features: [],
    limits: {},

    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60,
  };

  await setUserSession(payload);

  return NextResponse.json({
    message: 'Session cookie set',
  });
}
