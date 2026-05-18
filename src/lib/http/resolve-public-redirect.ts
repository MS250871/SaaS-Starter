import { headers } from 'next/headers';

function parseOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parsePort(host: string | null) {
  if (!host) {
    return '';
  }

  const [, port] = host.split(':');
  return port ? `:${port}` : '';
}

export async function resolvePublicRedirectTarget(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const hdrs = await headers();
  const forwardedHost = hdrs.get('x-forwarded-host');
  const forwardedProto =
    hdrs.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  if (forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`).toString();
  }

  const refererOrigin = parseOrigin(hdrs.get('referer'));
  if (refererOrigin) {
    return new URL(path, refererOrigin).toString();
  }

  const origin = parseOrigin(hdrs.get('origin'));
  if (origin) {
    return new URL(path, origin).toString();
  }

  const rootDomain = process.env.ROOT_DOMAIN;
  if (rootDomain) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const port = parsePort(hdrs.get('host'));
    return new URL(path, `${protocol}://${rootDomain}${port}`).toString();
  }

  const host = hdrs.get('host');
  if (host) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return new URL(path, `${protocol}://${host}`).toString();
  }

  return path;
}
