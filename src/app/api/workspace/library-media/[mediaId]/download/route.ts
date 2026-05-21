import { NextResponse } from 'next/server';

import { getUserSession } from '@/lib/auth/auth-cookies';
import { handleError } from '@/lib/errors/app-error';
import { createPresignedDownloadUrl } from '@/lib/media/r2';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { getWorkspaceMediaDownloadAccess } from '@/modules/media/media.services';
import { assertPermission } from '@/modules/permissions/permissions.services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    return await withRequestContext(request, async () => {
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

      assertPermission(session.permissions, 'media.read');

      const { mediaId } = await params;
      const requestUrl = new URL(request.url);
      const shouldDownload = requestUrl.searchParams.get('download') === '1';

      const media = await getWorkspaceMediaDownloadAccess({
        workspaceId: session.workspaceId,
        mediaId,
      });

      const signedUrl = await createPresignedDownloadUrl({
        key: media.storageKey,
        downloadFileName: shouldDownload ? media.fileName : undefined,
        responseContentType: media.mimeType,
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
              message: 'Unable to load media file',
            },
          },
          { status: 502 },
        );
      }

      const headers = new Headers();
      headers.set(
        'content-type',
        upstream.headers.get('content-type') ??
          media.mimeType ??
          'application/octet-stream',
      );
      headers.set(
        'content-disposition',
        shouldDownload
          ? `attachment; filename="${media.fileName.replace(/["\\]/g, '_')}"`
          : `inline; filename="${media.fileName.replace(/["\\]/g, '_')}"`,
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
