import { NextRequest, NextResponse } from 'next/server';
import {
  buildUserSessionCookieDescriptor,
} from '@/lib/auth/auth-cookies';
import { runWithActor } from '@/lib/context/actor-context';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { getHostname, normalizeHostname } from '@/lib/middleware/proxy-utils';
import { findSessionById } from '@/modules/auth/services/session.services';
import {
  buildHostTransferPath,
  readHostTransferToken,
} from '@/modules/auth/services/host-transfer.services';
import {
  buildFinalSessionWorkflow,
  resolveWorkspaceLoginRedirect,
  resolveWorkspaceSurfaceRedirect,
  type IdentitySessionSnapshot,
} from '@/modules/auth/workflows/post-login.workflow';

const systemTransferActor = {
  actorType: 'system' as const,
  permissions: [],
  features: [],
  limits: {},
  isPlatformAdmin: true,
};

async function buildLoginRedirectPath(params: {
  workspaceId?: string | null;
  intent?: 'free' | 'paid' | null;
  returnPath?: string | null;
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

  const loginPath = await resolveWorkspaceLoginRedirect({
    workspaceId: params.workspaceId,
    returnPath: params.returnPath,
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

function buildTransferDocument(params: {
  title: string;
  heading: string;
  message: string;
  destinationUrl: string;
}) {
  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const destination = JSON.stringify(params.destinationUrl);
  const escapedTitle = escapeHtml(params.title);
  const escapedHeading = escapeHtml(params.heading);
  const escapedMessage = escapeHtml(params.message);
  const escapedDestinationUrl = escapeHtml(params.destinationUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${escapedDestinationUrl}" />
    <title>${escapedTitle}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #09090b;
        --panel: rgba(24, 24, 27, 0.92);
        --border: rgba(255, 255, 255, 0.08);
        --text: #fafafa;
        --muted: #a1a1aa;
        --accent: #f5f5f5;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 32%),
          linear-gradient(180deg, #111114 0%, var(--bg) 55%);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(92vw, 30rem);
        border: 1px solid var(--border);
        border-radius: 1.5rem;
        background: var(--panel);
        padding: 2rem;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        text-align: center;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 0.45rem 0.85rem;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }

      h1 {
        margin: 1rem 0 0;
        font-size: clamp(1.5rem, 4vw, 2rem);
        line-height: 1.1;
      }

      p {
        margin: 0.9rem auto 0;
        max-width: 24rem;
        color: var(--muted);
        line-height: 1.6;
      }

      .spinner {
        width: 2.8rem;
        height: 2.8rem;
        margin: 1.5rem auto 0;
        border-radius: 999px;
        border: 3px solid rgba(255,255,255,0.12);
        border-top-color: var(--accent);
        animation: spin 0.9s linear infinite;
      }

      a {
        color: var(--accent);
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Workspace Transfer</div>
      <h1>${escapedHeading}</h1>
      <p>${escapedMessage}</p>
      <div class="spinner" aria-hidden="true"></div>
      <p>
        If nothing happens,
        <a href="${escapedDestinationUrl}">continue now</a>.
      </p>
    </main>
    <script>
      window.location.replace(${destination});
    </script>
  </body>
</html>`;
}

function buildTransferPageResponse(params: {
  title: string;
  heading: string;
  message: string;
  destinationUrl: string;
}) {
  return new NextResponse(buildTransferDocument(params), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function GET(req: NextRequest) {
  return withRequestContext(req, async () => {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    const transfer = await readHostTransferToken(token);
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

      const response = buildTransferPageResponse({
        title: 'Opening workspace',
        heading: 'Opening your workspace',
        message:
          'We are switching you to the correct workspace domain before finishing sign-in.',
        destinationUrl: redirectUrl.toString(),
      });
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
        await buildLoginRedirectPath({
          workspaceId: transfer.workspaceId,
          intent: transfer.intent,
          returnPath: transfer.returnPath,
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

    const destinationUrl = new URL(redirectTarget, buildTargetUrl('/'));
    const response = buildTransferPageResponse({
      title: 'Finishing sign-in',
      heading: 'Finishing sign-in',
      message:
        'Your session is ready. Taking you into the right workspace now.',
      destinationUrl: destinationUrl.toString(),
    });
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
