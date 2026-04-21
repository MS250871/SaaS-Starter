import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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

  rlsInitialized?: boolean;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>) {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore();

  if (!ctx) {
    throwError(ERR.INTERNAL_ERROR, 'RequestContext not initialized');
  }

  return ctx;
}

export function setPrismaInContext(prisma: PrismaClient) {
  const ctx = getRequestContext();
  ctx.prisma = prisma;
}
