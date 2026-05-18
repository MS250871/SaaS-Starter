import { NextRequest } from 'next/server';
import { decryptToken } from '@/lib/security/crypto';
import type { SessionClaims } from '@/lib/auth/auth.schema';

export async function resolveSession(req: NextRequest) {
  const token = req.cookies.get('user_session')?.value;

  if (!token) {
    return null;
  }

  const session = await decryptToken<SessionClaims>(token);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    return null;
  }

  if (!session.isActive) {
    return null;
  }

  return session;
}
