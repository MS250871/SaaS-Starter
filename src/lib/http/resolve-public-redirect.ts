import { headers } from 'next/headers';
import { resolvePublicHostValue } from '@/lib/http/public-url';

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

export async function resolvePublicRedirectTarget(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const hdrs = await headers();
  const publicHost = resolvePublicHostValue({
    host: hdrs.get('host'),
    forwardedHost: hdrs.get('x-forwarded-host'),
  });

  if (publicHost) {
    const protocol =
      hdrs.get('x-forwarded-proto') ??
      (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    return new URL(path, `${protocol}://${publicHost}`).toString();
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
    return new URL(path, `${protocol}://${rootDomain}`).toString();
  }

  return path;
}
