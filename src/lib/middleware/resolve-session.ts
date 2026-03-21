import { NextRequest } from 'next/server';
import { decryptToken } from '@/lib/security/crypto';
import type { SessionPayload } from '@/lib/auth/auth-cookies';

export async function resolveSession(req: NextRequest) {
  const token = req.cookies.get('user_session')?.value;

  if (!token) return null;

  const session = await decryptToken<SessionPayload>(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) return null;
  if (!session.isActive) return null;

  return session;
}
