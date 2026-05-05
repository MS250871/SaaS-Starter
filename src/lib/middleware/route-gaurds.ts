import { NextRequest, NextResponse } from 'next/server';
import { isPublicRoute, isProtectedRoute } from './proxy-utils';
import type { SessionPayload } from '@/lib/auth/auth.schema';

const VERIFY_ROUTE = '/verify-otp';
const VERIFY_PHONE_ROUTE = '/verify-phone';
const POST_LOGIN_ROUTE = '/post-login';
const CREATE_WORKSPACE_ROUTE = '/create-workspace';
const PAYMENT_ROUTE = '/payment';

export function handleRouteGuards(
  req: NextRequest,
  session: SessionPayload | null,
  pathnameOverride?: string,
): NextResponse | null {
  const pathname = pathnameOverride ?? req.nextUrl.pathname;

  const verifySession = req.cookies.get('verify_session')?.value;
  const hasSession = !!session;

  // Logged in → block login/signup
  if (hasSession && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL(POST_LOGIN_ROUTE, req.url));
  }

  // Protected
  if (!hasSession && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Post-login
  if (pathname === POST_LOGIN_ROUTE && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname === VERIFY_ROUTE && !verifySession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname === VERIFY_PHONE_ROUTE) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (!verifySession) {
      return NextResponse.redirect(new URL(POST_LOGIN_ROUTE, req.url));
    }
  }

  // Create workspace
  if (pathname === CREATE_WORKSPACE_ROUTE) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (pathname === PAYMENT_ROUTE && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return null;
}
