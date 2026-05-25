import { NextResponse } from 'next/server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { handleError } from '@/lib/errors/app-error';
import { createPresignedDownloadUrl } from '@/lib/media/r2';
import { withRequestContext } from '@/lib/request/withRequestContext';
import {
  assertPermission,
  hasAnyPermission,
} from '@/modules/permissions/services/permissions.services';
import { readWorkspaceProfileAssetPreviewToken } from '@/modules/workspace/services/workspace-profile-assets.services';
import { getWorkspaceProfileAssetAccessWorkflow } from '@/modules/workspace/workflows/get-workspace-profile-asset-access.workflow';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    return await withRequestContext(request, async () => {
      const { mediaId } = await params;
      const requestUrl = new URL(request.url);
      const shouldDownload = requestUrl.searchParams.get('download') === '1';
      const previewTokenValue = requestUrl.searchParams.get('token');
      const previewToken = previewTokenValue
        ? await readWorkspaceProfileAssetPreviewToken(previewTokenValue)
        : null;
      let workspaceId = previewToken?.workspaceId ?? null;

      if (!workspaceId) {
        const session = await getUserSession();

        if (!session?.workspaceId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Workspace session missing',
              },
            },
            { status: 401 },
          );
        }

        if (
          !hasAnyPermission(session.permissions, [
            'workspaceSettings.read',
            'workspaceSettings.update',
            'media.read',
          ])
        ) {
          assertPermission(session.permissions, 'workspaceSettings.read');
        }

        workspaceId = session.workspaceId;
      }

      if (previewToken && previewToken.mediaId !== mediaId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Workspace profile asset token is invalid',
            },
          },
          { status: 401 },
        );
      }

      const asset = await getWorkspaceProfileAssetAccessWorkflow({
        workspaceId,
        mediaId,
      });

      const signedUrl = await createPresignedDownloadUrl({
        key: asset.storageKey,
        downloadFileName: shouldDownload ? asset.fileName : undefined,
        responseContentType: asset.mimeType,
      });
      const upstream = await fetch(signedUrl, {
        cache: 'no-store',
      });

      if (!upstream.ok || !upstream.body) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BAD_GATEWAY',
              message: 'Unable to load workspace profile asset',
            },
          },
          { status: 502 },
        );
      }

      const headers = new Headers();
      headers.set(
        'content-type',
        upstream.headers.get('content-type') ??
          asset.mimeType ??
          'application/octet-stream',
      );
      headers.set(
        'content-disposition',
        shouldDownload
          ? `attachment; filename="${asset.fileName.replace(/["\\]/g, '_')}"`
          : `inline; filename="${asset.fileName.replace(/["\\]/g, '_')}"`,
      );
      headers.set('cache-control', 'private, no-store');

      const contentLength = upstream.headers.get('content-length');

      if (contentLength) {
        headers.set('content-length', contentLength);
      }

      return new Response(upstream.body, {
        status: 200,
        headers,
      });
    });
  } catch (e) {
    const err = handleError(e);

    return NextResponse.json(
      {
        success: false,
        error: err,
      },
      {
        status: err.status,
      },
    );
  }
}
