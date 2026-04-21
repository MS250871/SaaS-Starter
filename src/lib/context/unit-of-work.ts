import { prisma } from '@/lib/prisma';
import { getRequestContext, setPrismaInContext } from './request-context';
import { getActor } from './actor-context';
import { applyDbContext } from '@/lib/context/apply-db-context';

export async function withUnitOfWork<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getRequestContext();

  // If already inside transaction → reuse
  if (ctx.prisma) {
    return fn();
  }

  const previousPrisma = ctx.prisma;
  const actor = getActor();

  return prisma.$transaction(async (tx) => {
    await applyDbContext(tx as any, actor);
    setPrismaInContext(tx as any);

    try {
      return await fn();
    } finally {
      ctx.prisma = previousPrisma;
    }
  });
}
