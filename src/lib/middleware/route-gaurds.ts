import { NextRequest, NextResponse } from 'next/server';
import type { SessionClaims } from '@/lib/auth/auth.schema';
import {
  buildWorkspaceRedirectUrl,
  getHostname,
  isProtectedRoute,
  isPublicRoute,
  normalizeHostname,
} from './proxy-utils';
import {
  buildWorkspaceCanonicalPath,
  buildWorkspaceLoginPath,
  buildWorkspaceSurfacePath,
  normalizeWorkspaceDomainStrategy,
} from '@/modules/workspace/routing';

const VERIFY_ROUTE = '/verify-otp';
const VERIFY_PHONE_ROUTE = '/verify-phone';
const POST_LOGIN_ROUTE = '/post-login';
const CREATE_WORKSPACE_ROUTE = '/create-workspace';
const PAYMENT_ROUTE = '/payment';
const FORBIDDEN_ROUTE = '/forbidden';

type WorkspaceContext = {
  workspaceId: string;
  slug?: string;
  strategy?: string;
  intent?: 'free' | 'paid';
};

function isCustomerSurface(pathname: string) {
  return pathname === '/customer' || pathname.startsWith('/customer/');
}

function isWorkspaceAdminSurface(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/');
}

function isInviteAuthRoute(req: NextRequest, pathname: string) {
  if (!isPublicRoute(pathname)) {
    return false;
  }

  return !!req.nextUrl.searchParams.get('invite');
}

export function handleRouteGuards(
  req: NextRequest,
  session: SessionClaims | null,
  pathnameOverride?: string,
  workspace?: WorkspaceContext | null,
): NextResponse | null {
  const pathname = pathnameOverride ?? req.nextUrl.pathname;
  const verifySession = req.cookies.get('verify_session')?.value;
  const hasSession = !!session;
  const workspaceStrategy = normalizeWorkspaceDomainStrategy(workspace?.strategy);

  const buildWorkspacePath = (path: string) =>
    buildWorkspaceSurfacePath({
      strategy: workspaceStrategy,
      slug: workspace?.slug,
      path,
    });
  const currentHost = normalizeHostname(getHostname(req));
  const buildSameHostWorkspaceUrl = (path: string) =>
    buildWorkspaceRedirectUrl(req, currentHost, buildWorkspacePath(path));
  const buildForbiddenResponse = () =>
    NextResponse.rewrite(buildSameHostWorkspaceUrl(FORBIDDEN_ROUTE), {
      status: 403,
    });

  const buildWorkspaceLoginUrl = () => {
    if (!workspace?.workspaceId) {
      return buildWorkspaceRedirectUrl(req, currentHost, '/login');
    }

    const returnPath = workspace.slug
      ? `${buildWorkspaceCanonicalPath({
          strategy: workspaceStrategy,
          slug: workspace.slug,
          path: pathname,
        })}${req.nextUrl.search}`
      : undefined;

    const loginPath = buildWorkspaceLoginPath({
      workspaceId: workspace.workspaceId,
      intent: workspace.intent ?? (workspaceStrategy === 'free_path' ? 'free' : 'paid'),
      returnPath,
      strategy: workspaceStrategy,
      slug: workspace.slug,
    });

    return buildWorkspaceRedirectUrl(req, currentHost, loginPath);
  };

  if (
    hasSession &&
    workspace?.workspaceId &&
    (isWorkspaceAdminSurface(pathname) || isCustomerSurface(pathname))
  ) {
    const sameWorkspaceSession = session.workspaceId === workspace.workspaceId;
    const isCustomerSession = sameWorkspaceSession && !!session.customerId;
    const isWorkspaceMemberSession = sameWorkspaceSession && !!session.membershipId;

    if (!sameWorkspaceSession) {
      return buildForbiddenResponse();
    }

    if (isCustomerSurface(pathname) && !isCustomerSession) {
      if (isWorkspaceMemberSession) {
        return NextResponse.redirect(buildSameHostWorkspaceUrl('/app'));
      }

      return buildForbiddenResponse();
    }

    if (isWorkspaceAdminSurface(pathname) && !isWorkspaceMemberSession) {
      if (isCustomerSession) {
        return NextResponse.redirect(buildSameHostWorkspaceUrl('/customer'));
      }

      return buildForbiddenResponse();
    }
  }

  if (hasSession && isPublicRoute(pathname) && !isInviteAuthRoute(req, pathname)) {
    return NextResponse.redirect(
      new URL(buildWorkspacePath(POST_LOGIN_ROUTE), req.url),
    );
  }

  if (!hasSession && isProtectedRoute(pathname)) {
    return NextResponse.redirect(buildWorkspaceLoginUrl());
  }

  if (pathname === POST_LOGIN_ROUTE && !hasSession) {
    return NextResponse.redirect(buildWorkspaceLoginUrl());
  }

  if (pathname === VERIFY_ROUTE && !verifySession) {
    return NextResponse.redirect(buildWorkspaceLoginUrl());
  }

  if (pathname === VERIFY_PHONE_ROUTE) {
    if (!hasSession) {
      return NextResponse.redirect(buildWorkspaceLoginUrl());
    }

    if (!verifySession) {
      return NextResponse.redirect(
        new URL(buildWorkspacePath(POST_LOGIN_ROUTE), req.url),
      );
    }
  }

  if (pathname === CREATE_WORKSPACE_ROUTE && !hasSession) {
    return NextResponse.redirect(buildWorkspaceLoginUrl());
  }

  if (pathname === PAYMENT_ROUTE && !hasSession) {
    return NextResponse.redirect(buildWorkspaceLoginUrl());
  }

  return null;
}
