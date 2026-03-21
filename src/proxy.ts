import { NextRequest, NextResponse } from 'next/server';

import { resolveWorkspace } from '@/lib/middleware/resolve-workspace';
import { resolveSession } from '@/lib/middleware/resolve-session';

import { injectRequestHeaders } from '@/lib/middleware/request-headers';
import { injectActorHeaders } from '@/lib/middleware/actor-headers';
import { handleRouteGuards } from '@/lib/middleware/route-gaurds';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  console.log('HOST:', req.headers.get('host'));

  /* ---------------- WORKSPACE (FIRST) ---------------- */
  const workspace = await resolveWorkspace(req);

  /* ---------------- SESSION ---------------- */
  const session = await resolveSession(req);

  /* ---------------- REQUEST CONTEXT (IMPORTANT: AFTER workspace) ---------------- */
  await injectRequestHeaders(req, res, workspace);

  /* ---------------- ACTOR CONTEXT ---------------- */
  injectActorHeaders(res, session);

  /* ---------------- ROUTE GUARDS ---------------- */
  const guardResponse = handleRouteGuards(req, session);

  if (guardResponse) return guardResponse;

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
