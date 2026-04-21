import {
  mediaCrud,
  mediaQueries,
  fileAttachmentCrud,
  fileAttachmentQueries,
  mediaJobCrud,
  mediaJobQueries,
} from '@/modules/media/db';
import type {
  CreateInput,
  UpdateInput,
  WhereInput,
} from '@/lib/crud/prisma-types';
import type { MediaJobStatus, MediaStatus } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { buildMediaStorageKey, type MediaOwnerContext } from '@/lib/media/keys';
import {
  buildR2ObjectUrl,
  buildR2PublicUrl,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteR2Object,
  headR2Object,
  uploadObjectToR2,
} from '@/lib/media/r2';

type MediaContext = MediaOwnerContext;

type ListMediaParams = MediaContext & {
  status?: MediaStatus;
  fileName?: string;
  mimeType?: string;
  storageKey?: string;
  createdFrom?: Date;
  createdTo?: Date;
  take?: number;
  skip?: number;
  orderByCreatedAt?: 'asc' | 'desc';
};

type PrepareMediaUploadParams = MediaContext & {
  fileName: string;
  mimeType: string;
  size: number;
  checksum?: string | null;
  metadata?: CreateInput<'Media'>['metadata'];
  storageKey?: string;
  prefix?: string;
  expiresInSeconds?: number;
  cacheControl?: string;
  contentDisposition?: string;
};

type UploadMediaObjectParams = PrepareMediaUploadParams & {
  body: Parameters<typeof uploadObjectToR2>[0]['body'];
  markReady?: boolean;
};

type ListFileAttachmentsParams = MediaContext & {
  entityType?: string;
  entityId?: string;
  mediaId?: string;
  take?: number;
  skip?: number;
};

type AttachMediaParams = MediaContext & {
  mediaId: string;
  entityType: string;
  entityId: string;
};

type ListMediaJobsParams = {
  mediaId?: string;
  jobType?: string;
  status?: MediaJobStatus;
  createdFrom?: Date;
  createdTo?: Date;
  take?: number;
  skip?: number;
};

function normalizeContext(context: MediaContext = {}) {
  const workspaceId = context.workspaceId ?? undefined;
  const identityId = context.identityId ?? undefined;
  const customerId = context.customerId ?? undefined;

  const isEmpty = !workspaceId && !identityId && !customerId;
  if (isEmpty) {
    return {};
  }

  if (customerId && (!workspaceId || !identityId)) {
    throwError(
      ERR.INVALID_INPUT,
      'customerId requires both workspaceId and identityId',
    );
  }

  if (workspaceId && !identityId) {
    throwError(
      ERR.INVALID_INPUT,
      'workspaceId requires identityId for media ownership',
    );
  }

  return {
    ...(workspaceId ? { workspaceId } : {}),
    ...(identityId ? { identityId } : {}),
    ...(customerId ? { customerId } : {}),
  };
}

function buildMediaWhere(params?: ListMediaParams): WhereInput<'Media'> {
  return {
    ...normalizeContext(params ?? {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.fileName ? { fileName: params.fileName } : {}),
    ...(params?.mimeType ? { mimeType: params.mimeType } : {}),
    ...(params?.storageKey ? { storageKey: params.storageKey } : {}),
    ...(params?.createdFrom || params?.createdTo
      ? {
          createdAt: {
            ...(params?.createdFrom ? { gte: params.createdFrom } : {}),
            ...(params?.createdTo ? { lte: params.createdTo } : {}),
          },
        }
      : {}),
  } as WhereInput<'Media'>;
}

function buildFileAttachmentWhere(params?: ListFileAttachmentsParams) {
  return {
    ...normalizeContext(params ?? {}),
    ...(params?.entityType ? { entityType: params.entityType } : {}),
    ...(params?.entityId ? { entityId: params.entityId } : {}),
    ...(params?.mediaId ? { mediaId: params.mediaId } : {}),
  } as WhereInput<'FileAttachment'>;
}

function buildMediaJobWhere(params?: ListMediaJobsParams) {
  return {
    ...(params?.mediaId ? { mediaId: params.mediaId } : {}),
    ...(params?.jobType ? { jobType: params.jobType } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.createdFrom || params?.createdTo
      ? {
          createdAt: {
            ...(params?.createdFrom ? { gte: params.createdFrom } : {}),
            ...(params?.createdTo ? { lte: params.createdTo } : {}),
          },
        }
      : {}),
  } as WhereInput<'MediaJob'>;
}

function ensureAttachableMediaStatus(status: MediaStatus) {
  if (status === 'UPLOADING') {
    throwError(ERR.INVALID_STATE, 'Media upload is not finished yet');
  }

  if (status === 'FAILED' || status === 'DELETED') {
    throwError(ERR.INVALID_STATE, `Media cannot be attached in ${status} state`);
  }
}

function ensureContextMatchesMedia(
  media: {
    workspaceId?: string | null;
    identityId?: string | null;
    customerId?: string | null;
  },
  context: MediaContext,
) {
  const normalized = normalizeContext(context);

  if (
    normalized.workspaceId !== undefined &&
    normalized.workspaceId !== (media.workspaceId ?? undefined)
  ) {
    throwError(ERR.INVALID_INPUT, 'workspaceId does not match media ownership');
  }

  if (
    normalized.identityId !== undefined &&
    normalized.identityId !== (media.identityId ?? undefined)
  ) {
    throwError(ERR.INVALID_INPUT, 'identityId does not match media ownership');
  }

  if (
    normalized.customerId !== undefined &&
    normalized.customerId !== (media.customerId ?? undefined)
  ) {
    throwError(ERR.INVALID_INPUT, 'customerId does not match media ownership');
  }
}

/**
 * Media
 */
export async function getMediaById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media ID is required');

  const media = await mediaQueries.byId(id);
  if (!media) throwError(ERR.NOT_FOUND, 'Media not found');

  return media;
}

export async function findMediaByStorageKey(storageKey: string) {
  if (!storageKey) throwError(ERR.INVALID_INPUT, 'storageKey is required');

  return mediaQueries.findFirst({
    where: { storageKey },
  });
}

export async function listMedia(params?: ListMediaParams) {
  return mediaQueries.many({
    where: buildMediaWhere(params),
    orderBy: { createdAt: params?.orderByCreatedAt ?? 'desc' },
    take: params?.take,
    skip: params?.skip,
  });
}

export async function countMedia(params?: ListMediaParams) {
  return mediaQueries.count(buildMediaWhere(params));
}

export async function createMedia(data: CreateInput<'Media'>) {
  if (!data?.fileName || !data?.storageKey || !data?.mimeType || !data?.size) {
    throwError(
      ERR.INVALID_INPUT,
      'fileName, storageKey, mimeType and size are required',
    );
  }

  const context = normalizeContext({
    workspaceId: data.workspaceId,
    identityId: data.identityId,
    customerId: data.customerId,
  });

  const existing = await findMediaByStorageKey(data.storageKey);
  if (existing) {
    throwError(ERR.ALREADY_EXISTS, 'Media already exists');
  }

  const url = data.url ?? buildR2ObjectUrl(data.storageKey);
  const cdnUrl = data.cdnUrl ?? buildR2PublicUrl(data.storageKey);

  try {
    return await mediaCrud.create({
      ...data,
      ...context,
      url,
      ...(cdnUrl ? { cdnUrl } : {}),
      status: data.status ?? 'UPLOADING',
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create media', undefined, e);
  }
}

export async function updateMedia(id: string, data: UpdateInput<'Media'>) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media ID is required');

  try {
    return await mediaCrud.update(id, data);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to update media', undefined, e);
  }
}

export async function prepareMediaUpload(params: PrepareMediaUploadParams) {
  if (!params.fileName || !params.mimeType || !params.size) {
    throwError(
      ERR.INVALID_INPUT,
      'fileName, mimeType and size are required',
    );
  }

  const context = normalizeContext(params);
  const storageKey =
    params.storageKey ??
    buildMediaStorageKey({
      ...context,
      fileName: params.fileName,
      prefix: params.prefix,
    });

  const media = await createMedia({
    ...context,
    fileName: params.fileName,
    mimeType: params.mimeType,
    size: params.size,
    storageKey,
    url: buildR2ObjectUrl(storageKey),
    cdnUrl: buildR2PublicUrl(storageKey),
    checksum: params.checksum ?? undefined,
    metadata: params.metadata,
    status: 'UPLOADING',
  });

  const upload = await createPresignedUploadUrl({
    key: storageKey,
    contentType: params.mimeType,
    expiresInSeconds: params.expiresInSeconds,
    cacheControl: params.cacheControl,
    contentDisposition: params.contentDisposition,
  });

  return {
    media,
    storageKey,
    uploadUrl: upload.url,
    uploadMethod: upload.method,
    uploadHeaders: upload.headers,
    objectUrl: upload.objectUrl,
    publicUrl: upload.publicUrl,
  };
}

export async function finalizeMediaUpload(id: string) {
  const media = await getMediaById(id);
  const object = await headR2Object(media.storageKey);

  try {
    return await mediaCrud.update(id, {
      status: 'UPLOADED' as MediaStatus,
      size: object.contentLength ?? media.size,
      mimeType: object.contentType ?? media.mimeType,
      checksum: media.checksum ?? object.eTag ?? undefined,
      url: object.objectUrl,
      cdnUrl: object.publicUrl ?? media.cdnUrl ?? undefined,
    } as UpdateInput<'Media'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to finalize media upload', undefined, e);
  }
}

export async function uploadMediaObject(params: UploadMediaObjectParams) {
  const prepared = await prepareMediaUpload(params);

  try {
    await uploadObjectToR2({
      key: prepared.storageKey,
      body: params.body,
      contentType: params.mimeType,
      cacheControl: params.cacheControl,
      contentDisposition: params.contentDisposition,
    });

    const uploaded = await finalizeMediaUpload(prepared.media.id);

    if (params.markReady) {
      const ready = await markMediaReady(uploaded.id, prepared.publicUrl);

      return {
        ...prepared,
        media: ready,
      };
    }

    return {
      ...prepared,
      media: uploaded,
    };
  } catch (e) {
    await markMediaFailed(prepared.media.id);
    throw e;
  }
}

export async function markMediaStatus(id: string, status: MediaStatus) {
  return updateMedia(id, { status } as UpdateInput<'Media'>);
}

export async function markMediaUploaded(id: string) {
  return updateMedia(id, { status: 'UPLOADED' as MediaStatus });
}

export async function markMediaProcessing(id: string) {
  return markMediaStatus(id, 'PROCESSING' as MediaStatus);
}

export async function markMediaReady(id: string, cdnUrl?: string | null) {
  const media = await getMediaById(id);
  const resolvedCdnUrl = cdnUrl ?? buildR2PublicUrl(media.storageKey);

  return updateMedia(id, {
    status: 'READY' as MediaStatus,
    ...(resolvedCdnUrl ? { cdnUrl: resolvedCdnUrl } : {}),
  } as UpdateInput<'Media'>);
}

export async function markMediaFailed(id: string) {
  return markMediaStatus(id, 'FAILED' as MediaStatus);
}

export async function markMediaDeleted(id: string) {
  return markMediaStatus(id, 'DELETED' as MediaStatus);
}

export async function getMediaDownloadUrl(
  id: string,
  params?: {
    expiresInSeconds?: number;
    downloadFileName?: string;
  },
) {
  const media = await getMediaById(id);

  if (media.status === 'DELETED') {
    throwError(ERR.INVALID_STATE, 'Media has been deleted');
  }

  return createPresignedDownloadUrl({
    key: media.storageKey,
    expiresInSeconds: params?.expiresInSeconds,
    downloadFileName: params?.downloadFileName ?? media.fileName,
    responseContentType: media.mimeType,
  });
}

export async function deleteMediaObjectAndMarkDeleted(id: string) {
  const media = await getMediaById(id);

  await deleteR2Object(media.storageKey);
  return markMediaDeleted(id);
}

/**
 * File attachments
 */
export async function getFileAttachmentById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'File attachment ID is required');

  const attachment = await fileAttachmentQueries.byId(id, {
    include: { media: true },
  });

  if (!attachment) {
    throwError(ERR.NOT_FOUND, 'File attachment not found');
  }

  return attachment;
}

export async function findFileAttachment(
  mediaId: string,
  entityType: string,
  entityId: string,
) {
  if (!mediaId || !entityType || !entityId) {
    throwError(
      ERR.INVALID_INPUT,
      'mediaId, entityType and entityId are required',
    );
  }

  return fileAttachmentQueries.findFirst({
    where: { mediaId, entityType, entityId },
    include: { media: true },
  });
}

export async function listFileAttachments(params?: ListFileAttachmentsParams) {
  return fileAttachmentQueries.many({
    where: buildFileAttachmentWhere(params),
    include: { media: true },
    orderBy: { createdAt: 'desc' },
    take: params?.take,
    skip: params?.skip,
  });
}

export async function listFileAttachmentsByEntity(
  entityType: string,
  entityId: string,
) {
  if (!entityType || !entityId) {
    throwError(ERR.INVALID_INPUT, 'entityType and entityId are required');
  }

  return listFileAttachments({ entityType, entityId });
}

export async function listFileAttachmentsByMedia(mediaId: string) {
  if (!mediaId) {
    throwError(ERR.INVALID_INPUT, 'mediaId is required');
  }

  return listFileAttachments({ mediaId });
}

export async function createFileAttachment(data: CreateInput<'FileAttachment'>) {
  if (!data?.mediaId || !data?.entityType || !data?.entityId) {
    throwError(
      ERR.INVALID_INPUT,
      'mediaId, entityType and entityId are required',
    );
  }

  return attachMediaToEntity({
    mediaId: data.mediaId,
    entityType: data.entityType,
    entityId: data.entityId,
    workspaceId: data.workspaceId,
    identityId: data.identityId,
    customerId: data.customerId,
  });
}

export async function attachMediaToEntity(params: AttachMediaParams) {
  const media = await getMediaById(params.mediaId);
  ensureAttachableMediaStatus(media.status as MediaStatus);
  ensureContextMatchesMedia(media, params);

  const existing = await findFileAttachment(
    params.mediaId,
    params.entityType,
    params.entityId,
  );

  if (existing) {
    return existing;
  }

  const context = normalizeContext({
    workspaceId: params.workspaceId ?? media.workspaceId,
    identityId: params.identityId ?? media.identityId,
    customerId: params.customerId ?? media.customerId,
  });

  try {
    return await fileAttachmentCrud.create({
      mediaId: params.mediaId,
      entityType: params.entityType,
      entityId: params.entityId,
      ...context,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create file attachment', undefined, e);
  }
}

export async function deleteFileAttachment(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'File attachment ID is required');

  try {
    return await fileAttachmentCrud.delete(id);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to delete file attachment', undefined, e);
  }
}

/**
 * Media jobs
 */
export async function getMediaJobById(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media job ID is required');

  const job = await mediaJobQueries.byId(id, {
    include: { media: true },
  });

  if (!job) throwError(ERR.NOT_FOUND, 'Media job not found');

  return job;
}

export async function findMediaJob(params: {
  mediaId: string;
  jobType: string;
  status?: MediaJobStatus;
}) {
  if (!params.mediaId || !params.jobType) {
    throwError(ERR.INVALID_INPUT, 'mediaId and jobType are required');
  }

  return mediaJobQueries.findFirst({
    where: {
      mediaId: params.mediaId,
      jobType: params.jobType,
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listMediaJobs(params?: ListMediaJobsParams) {
  return mediaJobQueries.many({
    where: buildMediaJobWhere(params),
    include: { media: true },
    orderBy: { createdAt: 'desc' },
    take: params?.take,
    skip: params?.skip,
  });
}

export async function countMediaJobs(params?: ListMediaJobsParams) {
  return mediaJobQueries.count(buildMediaJobWhere(params));
}

export async function listMediaJobsByMedia(mediaId: string) {
  if (!mediaId) throwError(ERR.INVALID_INPUT, 'mediaId is required');

  return listMediaJobs({ mediaId });
}

export async function findPendingMediaJobs(params?: {
  jobType?: string;
  take?: number;
}) {
  return mediaJobQueries.many({
    where: {
      status: 'PENDING',
      ...(params?.jobType ? { jobType: params.jobType } : {}),
    },
    include: { media: true },
    orderBy: { createdAt: 'asc' },
    take: params?.take ?? 50,
  });
}

export async function createMediaJob(data: CreateInput<'MediaJob'>) {
  if (!data?.mediaId || !data?.jobType) {
    throwError(ERR.INVALID_INPUT, 'mediaId and jobType are required');
  }

  await getMediaById(data.mediaId);

  const existingPending = await findMediaJob({
    mediaId: data.mediaId,
    jobType: data.jobType,
    status: 'PENDING',
  });

  if (existingPending) {
    return existingPending;
  }

  try {
    return await mediaJobCrud.create({
      ...data,
      status: data.status ?? 'PENDING',
      error: data.error ?? undefined,
      processedAt: data.processedAt ?? undefined,
    });
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to create media job', undefined, e);
  }
}

export async function enqueueMediaJob(data: CreateInput<'MediaJob'>) {
  const job = await createMediaJob(data);
  await markMediaProcessing(job.mediaId);
  return job;
}

export async function requeueMediaJob(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media job ID is required');

  try {
    return await mediaJobCrud.update(id, {
      status: 'PENDING' as MediaJobStatus,
      processedAt: null,
      error: null,
    } as UpdateInput<'MediaJob'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to requeue media job', undefined, e);
  }
}

export async function markMediaJobDone(id: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media job ID is required');

  try {
    return await mediaJobCrud.update(id, {
      status: 'DONE' as MediaJobStatus,
      processedAt: new Date(),
      error: null,
    } as UpdateInput<'MediaJob'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to complete media job', undefined, e);
  }
}

export async function markMediaJobFailed(id: string, error: string) {
  if (!id) throwError(ERR.INVALID_INPUT, 'Media job ID is required');

  try {
    return await mediaJobCrud.update(id, {
      status: 'FAILED' as MediaJobStatus,
      processedAt: new Date(),
      error,
    } as UpdateInput<'MediaJob'>);
  } catch (e) {
    throwError(ERR.DB_ERROR, 'Failed to fail media job', undefined, e);
  }
}

export async function syncMediaStatusFromJobs(
  mediaId: string,
  params?: { readyCdnUrl?: string | null },
) {
  const jobs = await listMediaJobsByMedia(mediaId);

  if (jobs.length === 0) {
    return getMediaById(mediaId);
  }

  if (jobs.some((job) => job.status === 'FAILED')) {
    return markMediaFailed(mediaId);
  }

  if (jobs.some((job) => job.status === 'PENDING')) {
    return markMediaProcessing(mediaId);
  }

  return markMediaReady(mediaId, params?.readyCdnUrl);
}
