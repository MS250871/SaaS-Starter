import { NextRequest } from 'next/server';
import { randomUUID } from '@/lib/auth/auth-utils';
import { getRequestMetadata } from '@/lib/http/request-metadata';
import { ensureDeviceIdValue } from '@/lib/auth/auth-utils';
import { shouldUseSecureCookies } from '@/lib/http/cookie-security';

type WorkspaceContext = {
  workspaceId: string;
  slug?: string;
  isActive?: boolean;
  primaryDomain?: string;
  strategy?: string;
};

export type RequestHeaderInjectionResult = {
  deviceId: string;
  shouldSetDeviceCookie: boolean;
  secureCookies: boolean;
};

export async function injectRequestHeaders(
  req: NextRequest,
  headers: Headers,
  workspace?: WorkspaceContext | null,
  pathOverride?: string,
): Promise<RequestHeaderInjectionResult> {
  const resolvedPath = pathOverride ?? req.nextUrl.pathname;
  const secureCookies = shouldUseSecureCookies({
    forwardedProto: req.headers.get('x-forwarded-proto'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    host: req.headers.get('host'),
  });

  /* ---------------- REQUEST ID ---------------- */
  const requestId = randomUUID();

  /* ---------------- DEVICE ID ---------------- */
  const existingDeviceId = req.cookies.get('device_id')?.value;
  const deviceId = ensureDeviceIdValue(existingDeviceId);
  const shouldSetDeviceCookie =
    !existingDeviceId || existingDeviceId !== deviceId;

  /* ---------------- METADATA ---------------- */
  const metadata = await getRequestMetadata(req.headers, {
    includeClientDetails:
      resolvedPath === '/login' ||
      resolvedPath === '/signup' ||
      resolvedPath === '/verify-otp' ||
      resolvedPath === '/create-workspace',
  });

  /* ---------------- FULL CONTEXT ---------------- */
  const context = {
    requestId,

    workspace: workspace
      ? {
          workspaceId: workspace.workspaceId,
          slug: workspace.slug,
          isActive: workspace.isActive ?? true,
          primaryDomain: workspace.primaryDomain,
          strategy: workspace.strategy,
        }
      : undefined,

    ip: metadata.ip,
    browser: metadata.browser,
    os: metadata.os,
    device: metadata.device,
    userAgent: metadata.userAgent,

    deviceId,

    method: req.method,
    path: resolvedPath,
    originalPath: req.nextUrl.pathname,
    search: req.nextUrl.search,
  };

  /* ---------------- SINGLE HEADER ---------------- */
  headers.set('x-request-context', JSON.stringify(context));

  return {
    deviceId,
    shouldSetDeviceCookie,
    secureCookies,
  };
}
