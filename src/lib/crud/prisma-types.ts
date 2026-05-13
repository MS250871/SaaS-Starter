import type { Prisma, PrismaClient } from '@/generated/prisma/client';

/**
 * Prisma schema model names
 * "User" | "Product"
 */
export type ModelName = Prisma.ModelName;

/**
 * Convert to delegate name
 * "User" -> "user"
 */
export type DelegateName<M extends ModelName> = Uncapitalize<M>;

/**
 * Delegate union derived from PrismaClient
 * "user" | "product"
 */
export type DelegateKey = {
  [K in keyof PrismaClient]: PrismaClient[K] extends {
    findMany: (...args: never[]) => unknown;
  }
    ? K
    : never;
}[keyof PrismaClient];

/**
 * Delegate type
 */
export type ModelDelegate<M extends ModelName> = PrismaClient[DelegateName<M>];

/**
 * CRUD TYPES
 */
export type CreateInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'create'
>['data'];
export type CreateArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'create'
>;

export type UpdateInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'update'
>['data'];
export type UpdateArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'update'
>;
export type DeleteArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'delete'
>;

export type WhereInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findMany'
>['where'];

export type UniqueWhereInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findUnique'
>['where'];
export type FindUniqueArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findUnique'
>;
export type FindFirstArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findFirst'
>;
export type FindManyArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findMany'
>;
export type CountArgs<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'count'
>;

export type IncludeInput<M extends ModelName> =
  Prisma.Args<ModelDelegate<M>, 'findMany'> extends { include?: infer I }
    ? I
    : never;

export type SelectInput<M extends ModelName> =
  Prisma.Args<ModelDelegate<M>, 'findMany'> extends { select?: infer S }
    ? S
    : never;
