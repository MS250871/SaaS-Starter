import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

export type RequestMetadata = {
  ip?: string;
  browser?: string;
  os?: string;
  device?: string;
  userAgent?: string;
};

export async function getRequestMetadata(
  hdrs?: Headers,
  options?: {
    includeClientDetails?: boolean;
  },
): Promise<RequestMetadata> {
  const h = hdrs ?? (await headers());

  const forwarded = h.get('x-forwarded-for');
  const realIp = h.get('x-real-ip');

  const ip = forwarded?.split(',')[0]?.trim() || realIp || undefined;

  const userAgent = h.get('user-agent') ?? undefined;
  const includeClientDetails = options?.includeClientDetails ?? false;
  const result = includeClientDetails
    ? new UAParser(userAgent ?? '').getResult()
    : null;

  return {
    ip,
    userAgent,
    browser: result?.browser.name ?? undefined,
    os: result?.os.name ?? undefined,
    device: result ? result.device.type ?? 'desktop' : undefined,
  };
}
