import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionClaims, SessionPayload } from '@/lib/auth/auth.schema';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

export type DbClient = PrismaClient | Prisma.TransactionClient;

type WorkspaceContext = {
  workspaceId: string;
  slug: string;
  isActive: boolean;
  primaryDomain?: string;
  strategy?: string;
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
  originalPath?: string;
  search?: string;

  sessionClaims?: SessionClaims | null;
  session?: SessionPayload | null;

  prisma?: DbClient;
  auditState?: unknown;

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

export function maybeGetRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function setPrismaInContext(prisma: DbClient) {
  const ctx = getRequestContext();
  ctx.prisma = prisma;
}

export function setRequestAuditState(value: unknown) {
  const ctx = getRequestContext();
  ctx.auditState = value;
}

export function getRequestAuditState<T = unknown>() {
  return getRequestContext().auditState as T | undefined;
}

export function clearRequestAuditState() {
  const ctx = getRequestContext();
  delete ctx.auditState;
}
