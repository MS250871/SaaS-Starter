import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { handleError } from '@/lib/errors/app-error';
import { createPresignedDownloadUrl } from '@/lib/media/r2';
import { assertPermission } from '@/modules/permissions/permissions.services';
import { withRequestContext } from '@/lib/request/withRequestContext';
import { getWorkspaceSupportAttachmentAccessWorkflow } from '@/modules/workspace/workflows/get-workspace-support-attachment-access.workflow';

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

      assertPermission(session.permissions, 'supportTicket.read');

      const { mediaId } = await params;
      const requestUrl = new URL(request.url);
      const shouldDownload = requestUrl.searchParams.get('download') === '1';

      const attachment =
        await getWorkspaceSupportAttachmentAccessWorkflow({
          workspaceId: session.workspaceId,
          mediaId,
        });

      const signedUrl = await createPresignedDownloadUrl({
        key: attachment.storageKey,
        downloadFileName: shouldDownload ? attachment.fileName : undefined,
        responseContentType: attachment.mimeType,
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
              message: 'Unable to load support attachment',
            },
          },
          { status: 502 },
        );
      }

      const headers = new Headers();
      headers.set(
        'content-type',
        upstream.headers.get('content-type') ??
          attachment.mimeType ??
          'application/octet-stream',
      );
      headers.set(
        'content-disposition',
        shouldDownload
          ? `attachment; filename="${attachment.fileName.replace(/["\\]/g, '_')}"`
          : `inline; filename="${attachment.fileName.replace(/["\\]/g, '_')}"`,
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
