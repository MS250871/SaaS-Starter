import { ERR } from '@/lib/errors/codes';
import { throwError } from '@/lib/errors/app-error';
import { decryptToken, encryptToken } from '@/lib/security/crypto';
import {
  attachMediaToEntity,
  findFileAttachmentByScopedMediaId,
  uploadMediaObject,
} from '@/modules/media/services/media.services';

export const WORKSPACE_PROFILE_LOGO_ATTACHMENT_ENTITY_TYPE =
  'WORKSPACE_PROFILE_LOGO';
export const WORKSPACE_PROFILE_FAVICON_ATTACHMENT_ENTITY_TYPE =
  'WORKSPACE_PROFILE_FAVICON';

const MAX_PROFILE_ASSET_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_ASSET_PREVIEW_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

type WorkspaceProfileAssetPreviewToken = {
  workspaceId: string;
  mediaId: string;
  createdAt: number;
  expiresAt: number;
};

export type WorkspaceProfileAssetPreviewUrls = {
  logoPreviewUrl: string | null;
  faviconPreviewUrl: string | null;
};

function ensureImageAsset(file: File, label: string) {
  if (!file.size) {
    throwError(ERR.INVALID_INPUT, `${label} file is empty.`);
  }

  if (!file.type.startsWith('image/')) {
    throwError(ERR.INVALID_INPUT, `${label} must be an image file.`);
  }

  if (file.size > MAX_PROFILE_ASSET_SIZE_BYTES) {
    throwError(
      ERR.INVALID_INPUT,
      `${label} exceeds the ${Math.floor(
        MAX_PROFILE_ASSET_SIZE_BYTES / (1024 * 1024),
      )} MB upload limit.`,
    );
  }
}

export async function uploadWorkspaceProfileAsset(params: {
  workspaceId: string;
  identityId: string;
  file: File;
  assetType: 'logo' | 'favicon';
  logoAspect?: 'square' | '2:1' | '3:1' | '4:1';
}) {
  ensureImageAsset(
    params.file,
    params.assetType === 'logo' ? 'Logo' : 'Favicon',
  );

  const body = Buffer.from(await params.file.arrayBuffer());
  const uploaded = await uploadMediaObject({
    workspaceId: params.workspaceId,
    identityId: params.identityId,
    fileName: params.file.name,
    mimeType: params.file.type || 'application/octet-stream',
    size: params.file.size,
    body,
    prefix: `workspace-profile/${params.assetType}`,
    markReady: true,
    metadata: {
      assetType: params.assetType,
      ...(params.assetType === 'logo' && params.logoAspect
        ? { logoAspect: params.logoAspect }
        : {}),
    },
  });

  await attachMediaToEntity({
    mediaId: uploaded.media.id,
    entityType:
      params.assetType === 'logo'
        ? WORKSPACE_PROFILE_LOGO_ATTACHMENT_ENTITY_TYPE
        : WORKSPACE_PROFILE_FAVICON_ATTACHMENT_ENTITY_TYPE,
    entityId: params.workspaceId,
    workspaceId: params.workspaceId,
    identityId: params.identityId,
  });

  return {
    mediaId: uploaded.media.id,
    url: uploaded.media.cdnUrl ?? uploaded.media.url,
  };
}

export async function getWorkspaceProfileAssetAccess(params: {
  workspaceId: string;
  mediaId: string;
}) {
  if (!params.workspaceId || !params.mediaId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and mediaId are required');
  }

  const attachment = await findFileAttachmentByScopedMediaId({
    mediaId: params.mediaId,
    workspaceId: params.workspaceId,
    entityTypes: [
      WORKSPACE_PROFILE_LOGO_ATTACHMENT_ENTITY_TYPE,
      WORKSPACE_PROFILE_FAVICON_ATTACHMENT_ENTITY_TYPE,
    ],
  });

  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'Workspace profile asset not found');
  }

  if (attachment.media.status === 'DELETED') {
    throwError(ERR.INVALID_STATE, 'Workspace profile asset is no longer available');
  }

  return {
    attachmentId: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    mediaId: attachment.media.id,
    storageKey: attachment.media.storageKey,
    fileName: attachment.media.fileName,
    mimeType: attachment.media.mimeType,
    status: attachment.media.status,
  };
}

export async function issueWorkspaceProfileAssetPreviewToken(params: {
  workspaceId: string;
  mediaId: string;
}) {
  if (!params.workspaceId || !params.mediaId) {
    throwError(ERR.INVALID_INPUT, 'workspaceId and mediaId are required');
  }

  const now = Date.now();

  return encryptToken({
    workspaceId: params.workspaceId,
    mediaId: params.mediaId,
    createdAt: now,
    expiresAt: now + PROFILE_ASSET_PREVIEW_TOKEN_MAX_AGE_MS,
  } satisfies WorkspaceProfileAssetPreviewToken);
}

export async function readWorkspaceProfileAssetPreviewToken(token: string) {
  if (!token) {
    return null;
  }

  const payload = await decryptToken<unknown>(token);

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const previewToken = payload as Partial<WorkspaceProfileAssetPreviewToken>;

  if (
    typeof previewToken.workspaceId !== 'string' ||
    typeof previewToken.mediaId !== 'string' ||
    typeof previewToken.createdAt !== 'number' ||
    typeof previewToken.expiresAt !== 'number'
  ) {
    return null;
  }

  if (Date.now() > previewToken.expiresAt) {
    return null;
  }

  return previewToken as WorkspaceProfileAssetPreviewToken;
}

export async function buildWorkspaceProfileAssetPreviewUrl(params: {
  workspaceId: string;
  mediaId: string;
}) {
  const token = await issueWorkspaceProfileAssetPreviewToken(params);
  const search = new URLSearchParams({
    token,
  });

  return `/api/workspace/profile-media/${params.mediaId}/download?${search.toString()}`;
}

export async function buildWorkspaceProfileAssetPreviewUrls(params: {
  workspaceId: string;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
}): Promise<WorkspaceProfileAssetPreviewUrls> {
  const [logoPreviewUrl, faviconPreviewUrl] = await Promise.all([
    params.logoMediaId
      ? buildWorkspaceProfileAssetPreviewUrl({
          workspaceId: params.workspaceId,
          mediaId: params.logoMediaId,
        })
      : Promise.resolve(null),
    params.faviconMediaId
      ? buildWorkspaceProfileAssetPreviewUrl({
          workspaceId: params.workspaceId,
          mediaId: params.faviconMediaId,
        })
      : Promise.resolve(null),
  ]);

  return {
    logoPreviewUrl,
    faviconPreviewUrl,
  };
}
