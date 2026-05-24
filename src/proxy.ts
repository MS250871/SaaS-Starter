import { NextRequest, NextResponse } from 'next/server';

import { getAuthSecurityEnv } from '@/lib/env';
import { resolveWorkspace } from '@/lib/middleware/resolve-workspace';
import { resolveSession } from '@/lib/middleware/resolve-session';

import { injectRequestHeaders } from '@/lib/middleware/request-headers';
import { injectActorHeaders } from '@/lib/middleware/actor-headers';
import { handleRouteGuards } from '@/lib/middleware/route-gaurds';
import { stripInternalContextHeaders } from '@/lib/middleware/internal-context-headers';
import {
  resolveFreeWorkspacePath,
  resolveWorkspaceCanonicalRedirect,
} from '@/lib/middleware/proxy-utils';
import { WORKSPACE_PUBLIC_HOME_PATH } from '@/modules/workspace/routing';

getAuthSecurityEnv();

export async function proxy(req: NextRequest) {
  const freeWorkspacePath = resolveFreeWorkspacePath(req);
  const workspace = await resolveWorkspace(req);
  const normalizedPathname =
    workspace && (freeWorkspacePath?.rewrittenPathname ?? req.nextUrl.pathname) === '/'
      ? WORKSPACE_PUBLIC_HOME_PATH
      : freeWorkspacePath?.rewrittenPathname ?? req.nextUrl.pathname;
  const rewrittenUrl = req.nextUrl.clone();
  rewrittenUrl.pathname = normalizedPathname;
  const forwardedHeaders = new Headers(req.headers);
  stripInternalContextHeaders(forwardedHeaders);

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
  const requestHeaderState = await injectRequestHeaders(
    req,
    forwardedHeaders,
    workspace,
    normalizedPathname,
  );

  /* ---------------- ACTOR CONTEXT ---------------- */
  injectActorHeaders(forwardedHeaders, session);

  /* ---------------- ROUTE GUARDS ---------------- */
  const guardResponse = handleRouteGuards(
    req,
    session,
    normalizedPathname,
    workspace,
  );

  if (guardResponse) {
    if (requestHeaderState.shouldSetDeviceCookie) {
      guardResponse.cookies.set('device_id', requestHeaderState.deviceId, {
        httpOnly: true,
        secure: requestHeaderState.secureCookies,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    }

    if (hasStaleSessionCookie) {
      guardResponse.cookies.delete('user_session');
    }

    return guardResponse;
  }

  const res =
    normalizedPathname !== req.nextUrl.pathname
      ? NextResponse.rewrite(rewrittenUrl, {
          request: {
            headers: forwardedHeaders,
          },
        })
      : NextResponse.next({
          request: {
            headers: forwardedHeaders,
          },
        });

  if (requestHeaderState.shouldSetDeviceCookie) {
    res.cookies.set('device_id', requestHeaderState.deviceId, {
      httpOnly: true,
      secure: requestHeaderState.secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  if (hasStaleSessionCookie) {
    res.cookies.delete('user_session');
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
