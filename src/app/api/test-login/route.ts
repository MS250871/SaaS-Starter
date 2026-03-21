// app/api/test-login/route.ts

import { NextResponse } from 'next/server';
import { setUserSession } from '@/lib/auth/auth-cookies';

export async function GET() {
  const payload = {
    sessionId: 'sess_test_123',

    identityId: 'identity_1',
    workspaceId: 'ws_123',
    membershipId: 'mem_123',

    workspaceRole: 'owner',
    platformRole: 'user',

    isActive: true,

    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
  };

  await setUserSession(payload);

  return NextResponse.json({
    message: 'Session cookie set',
  });
}
