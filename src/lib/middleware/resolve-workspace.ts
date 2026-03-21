import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getHostname, extractApiKey } from './proxy-utils';

export async function resolveWorkspace(req: NextRequest) {
  const host = getHostname(req).split(':')[0]; // remove port
  const parts = host.split('.');

  const rootDomain = process.env.ROOT_DOMAIN!; // platform.localhost
  const rootParts = rootDomain.split('.'); // ["platform", "localhost"]

  /* ---------------------------------------------------------------------- */
  /* 1️⃣ API KEY                                                            */
  /* ---------------------------------------------------------------------- */

  const apiKey = extractApiKey(req);
  if (apiKey) {
    const data = await redis.get(`apiKey:${apiKey}`);
    if (data) return data as any;
  }

  /* ---------------------------------------------------------------------- */
  /* 2️⃣ CUSTOM DOMAIN                                                      */
  /* ---------------------------------------------------------------------- */

  const domainData = await redis.get(`domain:${host}`);
  if (domainData) return domainData as any;

  /* ---------------------------------------------------------------------- */
  /* 3️⃣ SUBDOMAIN RESOLUTION                                               */
  /* ---------------------------------------------------------------------- */

  // Example:
  // workspace1.platform.localhost → paid
  // platform.workspace1.localhost → free

  if (parts.length === rootParts.length + 1) {
    const domainTail = parts.slice(1).join('.');

    // ✅ PAID → workspace.platform.localhost
    if (domainTail === rootDomain) {
      const slug = parts[0];
      return (await redis.get(`slug:${slug}`)) as any;
    }

    // ✅ FREE → platform.workspace.localhost
    if (parts[0] === rootParts[0]) {
      const slug = parts[1];
      return (await redis.get(`slug:${slug}`)) as any;
    }
  }

  return null;
}
