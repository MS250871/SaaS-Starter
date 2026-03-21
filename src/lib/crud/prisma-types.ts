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
  [K in keyof PrismaClient]: PrismaClient[K] extends { findMany: any }
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

export type UpdateInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'update'
>['data'];

export type WhereInput<M extends ModelName> = Prisma.Args<
  ModelDelegate<M>,
  'findMany'
>['where'];

export type IncludeInput<M extends ModelName> =
  Prisma.Args<ModelDelegate<M>, 'findMany'> extends { include?: infer I }
    ? I
    : never;

export type SelectInput<M extends ModelName> =
  Prisma.Args<ModelDelegate<M>, 'findMany'> extends { select?: infer S }
    ? S
    : never;
