function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeHost(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function inferProtocol(host: string) {
  return host.includes("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
}

export function buildAbsoluteUrl(
  path: string,
  options?: {
    host?: string | null;
    protocol?: string | null;
  },
) {
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    null;

  if (baseUrl) {
    return `${normalizeBaseUrl(baseUrl)}${path}`;
  }

  const host = normalizeHost(
    options?.host ||
      process.env.VERCEL_URL ||
      process.env.ROOT_DOMAIN ||
      (process.env.NODE_ENV === "production"
        ? "localhost"
        : "localhost:3000"),
  );

  const protocol =
    options?.protocol?.replace(/:$/, "") ||
    (process.env.NODE_ENV === "production" ? inferProtocol(host) : "http");

  return `${protocol}://${host}${path}`;
}
