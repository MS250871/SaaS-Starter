import { ensureDeviceIdValue, randomUUID } from '@/lib/auth/auth-utils'
import type { RequestContext } from '@/lib/context/request-context'
import { getRequestMetadata } from '@/lib/http/request-metadata'

function readCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) {
    return undefined
  }

  const parts = cookieHeader.split(';')

  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=')

    if (rawKey !== key) {
      continue
    }

    return rest.join('=')
  }

  return undefined
}

export async function buildRequestContextFromRequest(
  req: Request,
): Promise<RequestContext> {
  const cookieHeader = req.headers.get('cookie')
  const deviceId = ensureDeviceIdValue(
    readCookieValue(cookieHeader, 'device_id'),
  )
  const url = new URL(req.url)
  const metadata = await getRequestMetadata(req.headers, {
    includeClientDetails:
      url.pathname === '/login' ||
      url.pathname === '/signup' ||
      url.pathname === '/verify-otp' ||
      url.pathname === '/create-workspace',
  })

  return {
    requestId: randomUUID(),
    ip: metadata.ip,
    browser: metadata.browser,
    os: metadata.os,
    device: metadata.device,
    userAgent: metadata.userAgent,
    deviceId,
    method: req.method,
    path: url.pathname,
    originalPath: url.pathname,
    search: url.search,
  }
}
