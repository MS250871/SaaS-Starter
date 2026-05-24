import { normalizeHostname } from '@/lib/middleware/proxy-utils';

function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  );
}

export function resolvePublicHostValue(params: {
  host?: string | null;
  forwardedHost?: string | null;
}) {
  const host = params.host?.trim() || null;
  const forwardedHost = params.forwardedHost?.trim() || null;

  if (host) {
    const normalizedHost = normalizeHostname(host);

    if (!isLoopbackHost(normalizedHost) || !forwardedHost) {
      return host;
    }
  }

  return forwardedHost ?? host ?? '';
}

export function resolvePublicHostname(params: {
  host?: string | null;
  forwardedHost?: string | null;
}) {
  return normalizeHostname(resolvePublicHostValue(params));
}

export function withPreservedPort(hostname: string, currentHostValue: string) {
  const port = currentHostValue.split(':')[1];

  if (!port || hostname.includes(':')) {
    return hostname;
  }

  return `${hostname}:${port}`;
}

export function buildPublicUrl(params: {
  path: string;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  fallbackUrl: string;
}) {
  const publicHost = resolvePublicHostValue({
    host: params.host,
    forwardedHost: params.forwardedHost,
  });
  const protocol =
    params.forwardedProto ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  if (publicHost) {
    return new URL(params.path, `${protocol}://${publicHost}`);
  }

  return new URL(params.path, params.fallbackUrl);
}
