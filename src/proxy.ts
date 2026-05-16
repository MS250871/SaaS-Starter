import { NextRequest, NextResponse } from 'next/server';

import { resolveWorkspace } from '@/lib/middleware/resolve-workspace';
import { resolveSession } from '@/lib/middleware/resolve-session';

import { injectRequestHeaders } from '@/lib/middleware/request-headers';
import { injectActorHeaders } from '@/lib/middleware/actor-headers';
import { handleRouteGuards } from '@/lib/middleware/route-gaurds';
import {
  resolveFreeWorkspacePath,
  resolveWorkspaceCanonicalRedirect,
} from '@/lib/middleware/proxy-utils';
import { WORKSPACE_PUBLIC_HOME_PATH } from '@/modules/workspace/routing';

export async function proxy(req: NextRequest) {
  const freeWorkspacePath = resolveFreeWorkspacePath(req);
  const workspace = await resolveWorkspace(req);
  const normalizedPathname =
    workspace && (freeWorkspacePath?.rewrittenPathname ?? req.nextUrl.pathname) === '/'
      ? WORKSPACE_PUBLIC_HOME_PATH
      : freeWorkspacePath?.rewrittenPathname ?? req.nextUrl.pathname;
  const rewrittenUrl = req.nextUrl.clone();
  rewrittenUrl.pathname = normalizedPathname;

  const res =
    normalizedPathname !== req.nextUrl.pathname
      ? NextResponse.rewrite(rewrittenUrl)
      : NextResponse.next();

  /* ---------------- SESSION ---------------- */
  const session = await resolveSession(req);
  const hasStaleSessionCookie = req.cookies.has('user_session') && !session;

  const canonicalRedirectUrl = workspace
    ? await resolveWorkspaceCanonicalRedirect({
        req,
        workspace,
        normalizedPathname,
        session,
      })
    : null;

  if (canonicalRedirectUrl) {
    const canonicalRedirect = NextResponse.redirect(canonicalRedirectUrl);

    if (hasStaleSessionCookie) {
      canonicalRedirect.cookies.delete('user_session');
    }

    return canonicalRedirect;
  }

  /* ---------------- REQUEST CONTEXT (IMPORTANT: AFTER workspace) ---------------- */
  await injectRequestHeaders(req, res, workspace, normalizedPathname);

  /* ---------------- ACTOR CONTEXT ---------------- */
  injectActorHeaders(res, session);

  /* ---------------- ROUTE GUARDS ---------------- */
  const guardResponse = handleRouteGuards(
    req,
    session,
    normalizedPathname,
    workspace,
  );

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
