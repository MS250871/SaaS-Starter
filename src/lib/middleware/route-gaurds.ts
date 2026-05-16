import { NextRequest, NextResponse } from 'next/server';
import type { SessionPayload } from '@/lib/auth/auth.schema';
import { isProtectedRoute, isPublicRoute } from './proxy-utils';
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

type WorkspaceContext = {
  workspaceId: string;
  slug?: string;
  strategy?: string;
};

function isInviteAuthRoute(req: NextRequest, pathname: string) {
  if (!isPublicRoute(pathname)) {
    return false;
  }

  return !!req.nextUrl.searchParams.get('invite');
}

export function handleRouteGuards(
  req: NextRequest,
  session: SessionPayload | null,
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

  const buildWorkspaceLoginUrl = () => {
    if (!workspace?.workspaceId) {
      return new URL('/login', req.url);
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
      intent: workspaceStrategy === 'free_path' ? 'free' : 'paid',
      returnPath,
      strategy: workspaceStrategy,
      slug: workspace.slug,
    });

    return new URL(loginPath, req.url);
  };

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
