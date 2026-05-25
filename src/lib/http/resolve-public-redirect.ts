import { headers } from 'next/headers';
import { resolvePublicHostValue, resolvePublicProtocol } from '@/lib/http/public-url';

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
    const protocol = resolvePublicProtocol({
      host: hdrs.get('host'),
      forwardedHost: hdrs.get('x-forwarded-host'),
      forwardedProto: hdrs.get('x-forwarded-proto'),
      fallbackUrl: hdrs.get('referer') ?? hdrs.get('origin'),
    });
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
    const protocol = resolvePublicProtocol({
      host: rootDomain,
    });
    return new URL(path, `${protocol}://${rootDomain}`).toString();
  }

  return path;
}
