import { normalizeHostname } from '@/lib/middleware/proxy-utils';

function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  );
}

function isLocalDevelopmentHost(hostname: string) {
  return (
    isLoopbackHost(hostname) ||
    hostname === 'lvh.me' ||
    hostname.endsWith('.lvh.me') ||
    hostname.endsWith('.localhost')
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

export function resolvePublicProtocol(params: {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  fallbackUrl?: string | null;
}) {
  const publicHostname = resolvePublicHostname({
    host: params.host,
    forwardedHost: params.forwardedHost,
  });

  if (publicHostname && isLocalDevelopmentHost(publicHostname)) {
    if (params.fallbackUrl) {
      try {
        const fallbackProtocol = new URL(params.fallbackUrl).protocol;

        if (fallbackProtocol === 'http:' || fallbackProtocol === 'https:') {
          return fallbackProtocol.slice(0, -1);
        }
      } catch {
        // Ignore malformed fallback URL and use plain HTTP below.
      }
    }

    return 'http';
  }

  const forwardedProto = params.forwardedProto?.split(',')[0]?.trim().toLowerCase();

  if (forwardedProto === 'http' || forwardedProto === 'https') {
    return forwardedProto;
  }

  return process.env.NODE_ENV === 'production' ? 'https' : 'http';
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
  const protocol = resolvePublicProtocol({
    host: params.host,
    forwardedHost: params.forwardedHost,
    forwardedProto: params.forwardedProto,
    fallbackUrl: params.fallbackUrl,
  });

  if (publicHost) {
    return new URL(params.path, `${protocol}://${publicHost}`);
  }

  return new URL(params.path, params.fallbackUrl);
}
