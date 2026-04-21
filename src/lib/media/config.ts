import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicBaseUrl?: string;
  uploadUrlExpiresInSeconds: number;
  downloadUrlExpiresInSeconds: number;
};

let cachedConfig: R2Config | undefined;

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function requireEnv(...names: string[]) {
  const value = readEnv(...names);

  if (!value) {
    throwError(
      ERR.INTERNAL_ERROR,
      `Missing media storage env: ${names.join(' or ')}`,
    );
  }

  return value;
}

function readPositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function getR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    accountId: requireEnv('R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv(
      'R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    ),
    bucketName: requireEnv('R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET_NAME'),
    endpoint: normalizeBaseUrl(
      requireEnv('R2_ENDPOINT', 'CLOUDFLARE_R2_ENDPOINT'),
    ),
    publicBaseUrl: readEnv(
      'R2_PUBLIC_BASE_URL',
      'R2_PUBLIC_URL',
      'R2_CUSTOM_DOMAIN',
      'CLOUDFLARE_R2_PUBLIC_BASE_URL',
    ),
    uploadUrlExpiresInSeconds: readPositiveInt(
      readEnv('R2_UPLOAD_URL_EXPIRES_IN'),
      900,
    ),
    downloadUrlExpiresInSeconds: readPositiveInt(
      readEnv('R2_DOWNLOAD_URL_EXPIRES_IN'),
      900,
    ),
  };

  if (cachedConfig.publicBaseUrl) {
    cachedConfig.publicBaseUrl = normalizeBaseUrl(cachedConfig.publicBaseUrl);
  }

  return cachedConfig;
}
