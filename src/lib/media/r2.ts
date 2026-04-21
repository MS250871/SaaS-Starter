import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Config } from './config';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type PresignedUploadParams = {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
};

type PresignedDownloadParams = {
  key: string;
  expiresInSeconds?: number;
  downloadFileName?: string;
  responseContentType?: string;
};

type UploadObjectParams = PresignedUploadParams & {
  body: PutObjectCommandInput['Body'];
};

let cachedClient: S3Client | undefined;

function ensureSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function encodeKeyForUrl(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildDownloadDisposition(fileName?: string) {
  if (!fileName) return undefined;

  const sanitized = fileName.replace(/["\\]/g, '_');
  return `attachment; filename="${sanitized}"`;
}

export function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export function buildR2ObjectUrl(key: string) {
  const config = getR2Config();
  const base = ensureSlash(config.endpoint);

  return new URL(
    `${encodeURIComponent(config.bucketName)}/${encodeKeyForUrl(key)}`,
    base,
  ).toString();
}

export function buildR2PublicUrl(key: string) {
  const config = getR2Config();

  if (!config.publicBaseUrl) {
    return undefined;
  }

  const base = ensureSlash(config.publicBaseUrl);
  return new URL(encodeKeyForUrl(key), base).toString();
}

export async function createPresignedUploadUrl(params: PresignedUploadParams) {
  if (!params.key || !params.contentType) {
    throwError(ERR.INVALID_INPUT, 'key and contentType are required');
  }

  const config = getR2Config();
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: params.key,
    ContentType: params.contentType,
    CacheControl: params.cacheControl,
    ContentDisposition: params.contentDisposition,
    Metadata: params.metadata,
  });

  try {
    const url = await getSignedUrl(client, command, {
      expiresIn: params.expiresInSeconds ?? config.uploadUrlExpiresInSeconds,
    });

    return {
      url,
      method: 'PUT' as const,
      headers: {
        'content-type': params.contentType,
      },
      objectUrl: buildR2ObjectUrl(params.key),
      publicUrl: buildR2PublicUrl(params.key),
    };
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to create presigned upload URL',
      undefined,
      e,
    );
  }
}

export async function createPresignedDownloadUrl(
  params: PresignedDownloadParams,
) {
  if (!params.key) {
    throwError(ERR.INVALID_INPUT, 'key is required');
  }

  const config = getR2Config();
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: params.key,
    ResponseContentDisposition: buildDownloadDisposition(
      params.downloadFileName,
    ),
    ResponseContentType: params.responseContentType,
  });

  try {
    return await getSignedUrl(client, command, {
      expiresIn:
        params.expiresInSeconds ?? config.downloadUrlExpiresInSeconds,
    });
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to create presigned download URL',
      undefined,
      e,
    );
  }
}

export async function uploadObjectToR2(params: UploadObjectParams) {
  if (!params.key || !params.contentType) {
    throwError(ERR.INVALID_INPUT, 'key and contentType are required');
  }

  const config = getR2Config();
  const client = getR2Client();

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
        ContentDisposition: params.contentDisposition,
        Metadata: params.metadata,
      }),
    );

    return {
      objectUrl: buildR2ObjectUrl(params.key),
      publicUrl: buildR2PublicUrl(params.key),
    };
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to upload object to R2',
      undefined,
      e,
    );
  }
}

export async function headR2Object(key: string) {
  if (!key) {
    throwError(ERR.INVALID_INPUT, 'key is required');
  }

  const config = getR2Config();
  const client = getR2Client();

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );

    return {
      contentLength: result.ContentLength ?? null,
      contentType: result.ContentType ?? null,
      eTag: result.ETag?.replace(/"/g, '') ?? null,
      lastModified: result.LastModified ?? null,
      metadata: result.Metadata ?? {},
      objectUrl: buildR2ObjectUrl(key),
      publicUrl: buildR2PublicUrl(key),
    };
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to inspect object in R2',
      undefined,
      e,
    );
  }
}

export async function deleteR2Object(key: string) {
  if (!key) {
    throwError(ERR.INVALID_INPUT, 'key is required');
  }

  const config = getR2Config();
  const client = getR2Client();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );
  } catch (e) {
    throwError(
      ERR.EXTERNAL_SERVICE_ERROR,
      'Failed to delete object from R2',
      undefined,
      e,
    );
  }
}
