import { NextRequest, NextResponse } from 'next/server';
import {
  clearAuthCookie,
  getAuthCookie,
  getVerificationSession,
  getUserSession,
  setAuthCookies,
  setVerificationSession,
  setUserSession,
} from '@/lib/auth/auth-cookies';
import { postLoginWorkflow } from '@/modules/auth/workflows/post-login.workflow';
import { processOtpOutboxEvent } from '@/modules/auth/services/otp-outbox.services';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { getRequestContext } from '@/lib/context/request-context';
import {
  buildWorkspaceLoginPath,
  buildWorkspaceSurfacePath,
} from '@/modules/workspace/routing';

export async function GET(req: NextRequest) {
  return withRequestContext(req, async () => {
    const identitySession = await getUserSession();
    const auth = await getAuthCookie();
    const requestContext = getRequestContext();
    const buildWorkspaceLoginUrl = () =>
      requestContext.workspace?.workspaceId
        ? new URL(
            buildWorkspaceLoginPath({
              workspaceId: requestContext.workspace.workspaceId,
              intent:
                requestContext.workspace.strategy === 'free_path'
                  ? 'free'
                  : 'paid',
              strategy: requestContext.workspace.strategy,
              slug: requestContext.workspace.slug,
            }),
            req.url,
          )
        : new URL('/login', req.url);

    if (!identitySession?.identityId || !auth) {
      return NextResponse.redirect(buildWorkspaceLoginUrl());
    }

    const activeVerification = await getVerificationSession();

    if (
      activeVerification?.mode === 'phone' &&
      activeVerification.identityId === identitySession.identityId
    ) {
      return NextResponse.redirect(
        new URL(
          buildWorkspaceSurfacePath({
            strategy: requestContext.workspace?.strategy,
            slug: requestContext.workspace?.slug,
            path: '/verify-phone',
          }),
          req.url,
        ),
      );
    }

    const result = await postLoginWorkflow({
      identitySession,
      auth,
    });

    if ('redirectTo' in result && !('finalSession' in result)) {
      if (result.meta?.verificationSession) {
        await setVerificationSession(result.meta.verificationSession);
        await setAuthCookies({
          data: {
            ...auth,
            createdAt: Date.now(),
          },
        });
      }

      if (result.meta?.outboxEventId) {
        await processOtpOutboxEvent(result.meta.outboxEventId);
      }

      return NextResponse.redirect(new URL(result.redirectTo, req.url));
    }

    if ('finalSession' in result && result.finalSession) {
      await setUserSession(result.finalSession);
      await clearAuthCookie();

      return NextResponse.redirect(
        new URL(result.redirectTo ?? '/dashboard', req.url),
      );
    }

    return NextResponse.redirect(buildWorkspaceLoginUrl());
  });
}
