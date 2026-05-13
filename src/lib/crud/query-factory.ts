import { getRequestContext } from '@/lib/context/request-context';
import type { Prisma } from '@/generated/prisma/client';
import {
  getWorkspaceId,
  shouldBypassWorkspace,
} from '@/lib/context/workspace-utils';
import { extractAppError, throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

import type {
  DelegateName,
  IncludeInput,
  ModelDelegate,
  ModelName,
  SelectInput,
  UniqueWhereInput,
  WhereInput,
} from './prisma-types';

type SortEntry = { column: string; dir: 'asc' | 'desc' };

type SearchColumn = {
  column: string;
  relationType?: 'one' | 'many';
};

type FilterValue =
  | { op: 'eq'; value: unknown }
  | { op: 'in'; value: unknown[] }
  | { op: 'contains'; value: string }
  | { op: 'gte'; value: unknown }
  | { op: 'lte'; value: unknown }
  | { op: 'between'; value: [unknown, unknown] }
  | { op: 'isNull'; value?: boolean };

type FilterEntry = FilterValue & {
  relationType?: 'one' | 'many';
};

type SearchOptions = {
  text?: string;
  columns?: SearchColumn[];
};

type Options<M extends ModelName> = {
  model: M;
  defaultActiveFilter?: boolean;
  workspaceScoped?: boolean;
  activeField?: string;
  workspaceField?: string;
};

type WhereArg<M extends ModelName> =
  | WhereInput<M>
  | {
      where?: WhereInput<M>;
    };

function toDelegate<M extends string>(model: M) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function getPrisma() {
  const ctx = getRequestContext();

  if (!ctx.prisma) {
    throwError(ERR.INTERNAL_ERROR, 'DB access without UnitOfWork');
  }

  if (!ctx.rlsInitialized) {
    throwError(ERR.INTERNAL_ERROR, 'RLS context not initialized');
  }

  return ctx.prisma;
}

function hasKeys(value: unknown) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value as Record<string, unknown>).length > 0
  );
}

function mergeWhereClauses<M extends ModelName>(
  ...clauses: Array<WhereInput<M> | undefined>
) {
  const filtered = clauses.filter(
    (clause): clause is WhereInput<M> => hasKeys(clause),
  );

  if (filtered.length === 0) {
    return {} as WhereInput<M>;
  }

  if (filtered.length === 1) {
    return filtered[0];
  }

  return {
    AND: filtered,
  } as WhereInput<M>;
}

function buildNestedSearchWhere(
  path: string[],
  text: string,
  relationType?: 'one' | 'many',
): Record<string, unknown> {
  if (path.length === 1) {
    return {
      [path[0]]: {
        contains: text,
        mode: 'insensitive',
      },
    };
  }

  const [first, ...rest] = path;

  if (relationType === 'many') {
    return {
      [first]: {
        some: buildNestedSearchWhere(rest, text),
      },
    };
  }

  return {
    [first]: buildNestedSearchWhere(rest, text),
  };
}

function buildFilterOperation(filter: FilterValue) {
  switch (filter.op) {
    case 'eq':
      return filter.value;

    case 'in':
      return { in: filter.value };

    case 'contains':
      return { contains: filter.value, mode: 'insensitive' };

    case 'gte':
      return { gte: filter.value };

    case 'lte':
      return { lte: filter.value };

    case 'between':
      return { gte: filter.value[0], lte: filter.value[1] };

    case 'isNull':
      return filter.value === true ? null : { not: null };
  }
}

function buildNestedFilterWhere(
  path: string[],
  filter: FilterEntry,
  relationType?: 'one' | 'many',
): Record<string, unknown> {
  if (path.length === 1) {
    return {
      [path[0]]: buildFilterOperation(filter),
    };
  }

  const [first, ...rest] = path;

  if (relationType === 'many') {
    return {
      [first]: {
        some: buildNestedFilterWhere(rest, filter),
      },
    };
  }

  return {
    [first]: buildNestedFilterWhere(rest, filter),
  };
}

function buildFiltersWhere<M extends ModelName>(
  filters?: Record<string, FilterEntry>,
) {
  if (!filters) {
    return undefined;
  }

  const clauses = Object.entries(filters)
    .filter(([column]) => !column.startsWith('_count.'))
    .map(([column, filter]) =>
      buildNestedFilterWhere(
        column.split('.'),
        filter,
        filter.relationType,
      ),
    );

  if (clauses.length === 0) {
    return undefined;
  }

  return mergeWhereClauses<M>(...(clauses as Array<WhereInput<M>>));
}

function buildSearchWhere<M extends ModelName>(search?: SearchOptions) {
  if (!search?.text || !search.columns?.length) {
    return undefined;
  }

  return {
    OR: search.columns.map((column) =>
      buildNestedSearchWhere(
        column.column.split('.'),
        search.text as string,
        column.relationType,
      ),
    ),
  } as WhereInput<M>;
}

function rethrowKnownAppError(error: unknown): never | void {
  if (extractAppError(error)) {
    throw error;
  }
}

function normalizeWhereArg<M extends ModelName>(
  arg?: WhereArg<M>,
): WhereInput<M> | undefined {
  if (!arg) {
    return undefined;
  }

  if (
    typeof arg === 'object' &&
    arg !== null &&
    'where' in arg &&
    Object.keys(arg).every((key) => key === 'where')
  ) {
    return (arg as { where?: WhereInput<M> }).where;
  }

  return arg as WhereInput<M>;
}

export function buildQueries<M extends ModelName>({
  model,
  defaultActiveFilter = false,
  workspaceScoped = true,
  activeField,
  workspaceField = 'workspaceId',
}: Options<M>) {
  const delegateName = toDelegate(model) as DelegateName<M>;

  function delegate() {
    const prisma = getPrisma();
    const d = prisma[delegateName];

    if (!d) {
      throwError(
        ERR.INTERNAL_ERROR,
        `Prisma delegate not found for model: ${model} -> ${delegateName}`,
      );
    }

    return d as ModelDelegate<M>;
  }

  function callFindUnique<
    A extends {
      where: UniqueWhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
    },
  >(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'findUnique'>
    // Prisma delegate methods become an incompatible union at this generic boundary.
    // Keep the looseness contained here rather than leaking it into callers.
    const fn = delegate().findUnique as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function callFindFirst<
    A extends {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: unknown;
    },
  >(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'findFirst'>
    const fn = delegate().findFirst as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function callFindMany<
    A extends {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: unknown;
      take?: number;
      skip?: number;
    },
  >(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'findMany'>
    const fn = delegate().findMany as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function callCount<A extends { where?: WhereInput<M> }>(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'count'>
    const fn = delegate().count as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function withDefaultWhere(where?: WhereInput<M>): WhereInput<M> {
    const clauses: Array<WhereInput<M>> = [];

    if (where && hasKeys(where)) {
      clauses.push(where);
    }

    if (defaultActiveFilter && activeField) {
      clauses.push({
        [activeField]: true,
      } as WhereInput<M>);
    }

    if (workspaceScoped && !shouldBypassWorkspace()) {
      const workspaceId = getWorkspaceId();

      if (!workspaceId) {
        throwError(
          ERR.TENANT_REQUIRED,
          `Workspace context missing for ${model}`,
        );
      }

      clauses.push({
        [workspaceField]: workspaceId,
      } as WhereInput<M>);
    }

    return mergeWhereClauses<M>(...clauses);
  }

  return {
    async byId(
      id: string,
      opts?: {
        include?: IncludeInput<M>;
        select?: SelectInput<M>;
      },
    ) {
      try {
        return await callFindFirst({
          where: withDefaultWhere({ id } as WhereInput<M>),
          ...opts,
        });
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async findUnique(opts: {
      where: UniqueWhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
    }) {
      try {
        return await callFindUnique({
          where: opts.where,
          include: opts.include,
          select: opts.select,
        });
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async findFirst(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: unknown;
    }) {
      try {
        return await callFindFirst({
          ...opts,
          where: withDefaultWhere(opts?.where),
        });
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async many(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: unknown;
      take?: number;
      skip?: number;
    }) {
      try {
        return await callFindMany({
          ...opts,
          where: withDefaultWhere(opts?.where),
        });
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to list ${model}`, undefined, e);
      }
    },

    async paginated(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: unknown;
      page?: number;
      pageSize?: number;
      sort?: SortEntry[];
      search?: SearchOptions;
      filters?: Record<string, FilterEntry>;
    }) {
      try {
        const page = opts?.page ?? 1;
        const pageSize = opts?.pageSize ?? 20;
        const where = mergeWhereClauses<M>(
          withDefaultWhere(opts?.where),
          buildFiltersWhere<M>(opts?.filters),
          buildSearchWhere<M>(opts?.search),
        );

        let orderBy = opts?.orderBy ?? undefined;

        if (opts?.sort && opts.sort.length > 0) {
          orderBy = opts.sort.map((sort) => {
            if (sort.column.startsWith('_count.')) {
              const relation = sort.column.split('.')[1];
              return { [relation]: { _count: sort.dir } };
            }

            if (sort.column.includes('.')) {
              const parts = sort.column.split('.');
              return parts.reduceRight<unknown>(
                (acc, part) => ({ [part]: acc }),
                sort.dir,
              );
            }

            return { [sort.column]: sort.dir };
          });
        }

        const [items, total] = await Promise.all([
          callFindMany({
            where,
            include: opts?.include,
            select: opts?.select,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          callCount({ where }),
        ]);

        return {
          items,
          total,
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
        };
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to query ${model}`, undefined, e);
      }
    },

    async count(whereArg?: WhereArg<M>) {
      try {
        const where = normalizeWhereArg(whereArg);

        return await callCount({
          where: withDefaultWhere(where),
        });
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(ERR.DB_ERROR, `Failed to count ${model}`, undefined, e);
      }
    },

    async exists(whereArg?: WhereArg<M>) {
      try {
        const where = normalizeWhereArg(whereArg);
        const result = await callFindFirst({
          where: withDefaultWhere(where),
          select: { id: true } as SelectInput<M>,
        });

        return !!result;
      } catch (e) {
        rethrowKnownAppError(e);
        throwError(
          ERR.DB_ERROR,
          `Failed to check existence of ${model}`,
          undefined,
          e,
        );
      }
    },

    get delegate() {
      return delegate();
    },
  };
}
