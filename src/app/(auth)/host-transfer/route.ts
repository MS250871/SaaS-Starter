import { NextRequest, NextResponse } from 'next/server';
import {
  buildUserSessionCookieDescriptor,
} from '@/lib/auth/auth-cookies';
import { runWithActor } from '@/lib/context/actor-context';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { getRequestContext } from '@/lib/context/request-context';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getHostname, normalizeHostname } from '@/lib/middleware/proxy-utils';
import { findSessionById } from '@/modules/auth/services/session.services';
import {
  buildHostTransferPath,
  readHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';
import {
  buildFinalSessionWorkflow,
  resolveWorkspaceSurfaceRedirect,
  type IdentitySessionSnapshot,
} from '@/modules/auth/workflows/post-login.workflow';
import { buildWorkspaceLoginPath } from '@/modules/workspace/routing';

const systemTransferActor = {
  actorType: 'system' as const,
  permissions: [],
  features: [],
  limits: {},
  isPlatformAdmin: true,
};

function buildLoginRedirectPath(params: {
  workspaceId?: string | null;
  intent?: 'free' | 'paid' | null;
  returnPath?: string | null;
  strategy?: string | null;
  slug?: string | null;
}) {
  if (!params.workspaceId) {
    const search = new URLSearchParams({
      reason: 'workspace-moved',
    });

    if (params.intent) {
      search.set('intent', params.intent);
    }

    return `/login?${search.toString()}`;
  }

  const loginPath = buildWorkspaceLoginPath({
    workspaceId: params.workspaceId,
    intent: params.intent,
    returnPath: params.returnPath,
    strategy: params.strategy,
    slug: params.slug,
  });
  const url = new URL(loginPath, 'https://skillmaxx.local');
  url.searchParams.set('reason', 'workspace-moved');

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function buildSessionSnapshot(params: {
  id: string;
  identityId: string;
  ip?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  deviceId?: string | null;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
}): IdentitySessionSnapshot {
  return {
    sessionId: params.id,
    identityId: params.identityId,
    ip: params.ip ?? undefined,
    browser: params.browser ?? undefined,
    os: params.os ?? undefined,
    device: params.device ?? undefined,
    deviceId: params.deviceId ?? undefined,
    deviceFingerprint: params.deviceFingerprint ?? undefined,
    userAgent: params.userAgent ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  return withRequestContext(req, async () => {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    const transfer = await readHostTransferToken(token);
    const requestContext = getRequestContext();
    const requestHost = getHostname(req);
    const requestPort = requestHost.split(':')[1] ?? req.nextUrl.port;
    const targetHost = transfer ? normalizeHostname(transfer.targetHost) : null;
    const buildTargetUrl = (path: string) => {
      const url = new URL(path, req.url);

      if (targetHost) {
        url.hostname = targetHost;
        url.port = requestPort;
      }

      return url;
    };

    if (!transfer) {
      return NextResponse.redirect(new URL('/login?reason=workspace-moved', req.url));
    }

    const currentHost = normalizeHostname(requestHost);

    if (targetHost && currentHost !== targetHost) {
      const redirectUrl = new URL(buildHostTransferPath(token), req.url);
      redirectUrl.hostname = targetHost;
      redirectUrl.port = requestPort;

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete('auth_flow');
      response.cookies.delete('verify_session');

      return response;
    }

    const currentSession = await runWithActor(systemTransferActor, () =>
      withUnitOfWork(() => findSessionById(transfer.sessionId)),
    );

    if (
      !currentSession ||
      !currentSession.isActive ||
      currentSession.identityId !== transfer.identityId ||
      currentSession.expiresAt.getTime() <= Date.now()
    ) {
      const loginUrl = new URL(
        buildLoginRedirectPath({
          workspaceId: transfer.workspaceId,
          intent: transfer.intent,
          returnPath: transfer.returnPath,
          strategy:
            requestContext.workspace?.workspaceId === transfer.workspaceId
              ? requestContext.workspace.strategy
              : undefined,
          slug:
            requestContext.workspace?.workspaceId === transfer.workspaceId
              ? requestContext.workspace.slug
              : undefined,
        }),
        buildTargetUrl('/'),
      );

      return NextResponse.redirect(loginUrl);
    }

    const finalSession = await runWithActor(systemTransferActor, () =>
      buildFinalSessionWorkflow({
        identitySession: buildSessionSnapshot(currentSession),
        workspaceId: transfer.workspaceId,
      }),
    );

    const redirectTarget =
      transfer.returnPath ??
      (await runWithActor(systemTransferActor, () =>
        resolveWorkspaceSurfaceRedirect({
          workspaceId: transfer.workspaceId,
          fallbackPath: '/app',
        }),
      ));

    const response = NextResponse.redirect(
      new URL(redirectTarget, buildTargetUrl('/')),
    );
    const sessionCookie = await buildUserSessionCookieDescriptor(finalSession);

    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options,
    );
    response.cookies.delete('auth_flow');
    response.cookies.delete('verify_session');

    return response;
  });
}
