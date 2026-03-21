import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@/generated/prisma/client';

type WorkspaceContext = {
  workspaceId: string;
  slug: string;
  isActive: boolean;
  primaryDomain?: string;
};

export type RequestContext = {
  requestId: string;

  workspace?: WorkspaceContext;

  ip?: string;
  browser?: string;
  os?: string;
  device?: string;
  userAgent?: string;

  deviceId?: string;

  method?: string;
  path?: string;

  prisma?: PrismaClient;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>) {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore();

  if (!ctx) {
    throw new Error('RequestContext not initialized');
  }

  return ctx;
}

export function setPrismaInContext(prisma: PrismaClient) {
  const ctx = getRequestContext();
  ctx.prisma = prisma;
}
