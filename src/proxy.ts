import { NextRequest, NextResponse } from 'next/server';

import { resolveWorkspace } from '@/lib/middleware/resolve-workspace';
import { resolveSession } from '@/lib/middleware/resolve-session';

import { injectRequestHeaders } from '@/lib/middleware/request-headers';
import { injectActorHeaders } from '@/lib/middleware/actor-headers';
import { handleRouteGuards } from '@/lib/middleware/route-gaurds';
import { resolveFreeWorkspacePath } from '@/lib/middleware/proxy-utils';

export async function proxy(req: NextRequest) {
  const freeWorkspacePath = resolveFreeWorkspacePath(req);
  const normalizedPathname =
    freeWorkspacePath?.rewrittenPathname ?? req.nextUrl.pathname;
  const rewrittenUrl = req.nextUrl.clone();
  rewrittenUrl.pathname = normalizedPathname;

  const res =
    normalizedPathname !== req.nextUrl.pathname
      ? NextResponse.rewrite(rewrittenUrl)
      : NextResponse.next();

  /* ---------------- WORKSPACE (FIRST) ---------------- */
  const workspace = await resolveWorkspace(req);

  /* ---------------- SESSION ---------------- */
  const session = await resolveSession(req);
  const hasStaleSessionCookie = req.cookies.has('user_session') && !session;

  /* ---------------- REQUEST CONTEXT (IMPORTANT: AFTER workspace) ---------------- */
  await injectRequestHeaders(req, res, workspace, normalizedPathname);

  /* ---------------- ACTOR CONTEXT ---------------- */
  injectActorHeaders(res, session);

  /* ---------------- ROUTE GUARDS ---------------- */
  const guardResponse = handleRouteGuards(req, session, normalizedPathname);

  if (guardResponse) {
    if (hasStaleSessionCookie) {
      guardResponse.cookies.delete('user_session');
    }

    return guardResponse;
  }

  if (hasStaleSessionCookie) {
    res.cookies.delete('user_session');
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
