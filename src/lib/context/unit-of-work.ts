import { prisma } from '@/lib/prisma';
import { getRequestContext, setPrismaInContext } from './request-context';

export async function withUnitOfWork<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = getRequestContext();
  const previousPrisma = ctx.prisma;

  return prisma.$transaction(async (tx) => {
    setPrismaInContext(tx as any);

    try {
      return await fn();
    } finally {
      ctx.prisma = previousPrisma;
    }
  });
}
