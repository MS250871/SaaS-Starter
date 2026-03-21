import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from '@/lib/auth/auth-utils';
import { getRequestMetadata } from '@/lib/http/request-metadata';

const IS_PROD = process.env.NODE_ENV === 'production';

type WorkspaceContext = {
  workspaceId: string;
  slug?: string;
  isActive?: boolean;
  primaryDomain?: string;
};

export async function injectRequestHeaders(
  req: NextRequest,
  res: NextResponse,
  workspace?: WorkspaceContext | null,
) {
  /* ---------------- REQUEST ID ---------------- */
  const requestId = randomUUID();

  /* ---------------- DEVICE ID ---------------- */
  let deviceId = req.cookies.get('device_id')?.value;

  if (!deviceId) {
    deviceId = randomUUID();

    res.cookies.set('device_id', deviceId, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  /* ---------------- METADATA ---------------- */
  const metadata = await getRequestMetadata(req.headers);

  /* ---------------- FULL CONTEXT ---------------- */
  const context = {
    requestId,

    workspace: workspace
      ? {
          workspaceId: workspace.workspaceId,
          slug: workspace.slug,
          isActive: workspace.isActive ?? true,
          primaryDomain: workspace.primaryDomain,
        }
      : undefined,

    ip: metadata.ip,
    browser: metadata.browser,
    os: metadata.os,
    device: metadata.device,
    userAgent: metadata.userAgent,

    deviceId,

    method: req.method,
    path: req.nextUrl.pathname,
  };

  /* ---------------- SINGLE HEADER ---------------- */
  res.headers.set('x-request-context', JSON.stringify(context));
}
