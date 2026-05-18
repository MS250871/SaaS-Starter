import { prisma } from '@/lib/prisma';
import { getRequestContext, setPrismaInContext } from './request-context';
import { getActor } from './actor-context';
import { applyDbContext } from '@/lib/context/apply-db-context';

const TX_MAX_WAIT_MS = 15_000;
const TX_TIMEOUT_MS = 60_000;

export async function withUnitOfWork<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getRequestContext();

  // If already inside transaction → reuse
  if (ctx.prisma) {
    return fn();
  }

  const previousPrisma = ctx.prisma;
  const actor = getActor();

  return prisma.$transaction(
    async (tx) => {
      await applyDbContext(tx, actor);
      setPrismaInContext(tx);

      try {
        return await fn();
      } finally {
        ctx.prisma = previousPrisma;
      }
    },
    {
      maxWait: TX_MAX_WAIT_MS,
      timeout: TX_TIMEOUT_MS,
    },
  );
}
