function normalizeHostname(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const first = value.split(',')[0]?.trim();
  if (!first) {
    return null;
  }

  return first.split(':')[0]?.trim().toLowerCase() || null;
}

function parseUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalCookieHost(hostname: string | null) {
  if (!hostname) {
    return false;
  }

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === 'lvh.me' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.lvh.me')
  );
}

export function shouldUseSecureCookies(input: {
  forwardedProto?: string | null;
  origin?: string | null;
  referer?: string | null;
  host?: string | null;
}) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  const forwardedProto = input.forwardedProto?.split(',')[0]?.trim().toLowerCase();

  if (forwardedProto) {
    return forwardedProto === 'https';
  }

  const originUrl = parseUrl(input.origin);
  if (originUrl) {
    if (isLocalCookieHost(originUrl.hostname)) {
      return originUrl.protocol === 'https:';
    }

    return true;
  }

  const refererUrl = parseUrl(input.referer);
  if (refererUrl) {
    if (isLocalCookieHost(refererUrl.hostname)) {
      return refererUrl.protocol === 'https:';
    }

    return true;
  }

  return !isLocalCookieHost(normalizeHostname(input.host));
}
