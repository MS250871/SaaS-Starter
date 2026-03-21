import { NextRequest } from 'next/server';

export function getHostname(req: NextRequest) {
  return req.headers.get('host') || '';
}

export function getSubdomains(host: string) {
  const parts = host.split('.');

  if (parts.length && parts[parts.length - 1].includes(':')) {
    parts[parts.length - 1] = parts[parts.length - 1].split(':')[0];
  }

  return parts;
}

export function extractApiKey(req: NextRequest): string | null {
  return (
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

export function isPublicRoute(pathname: string) {
  return pathname === '/login' || pathname === '/signup';
}

export function isProtectedRoute(pathname: string) {
  return pathname.startsWith('/app') || pathname.startsWith('/dashboard');
}
