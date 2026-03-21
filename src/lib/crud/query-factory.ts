// /lib/crud/query-factory.ts

import { prisma as rootPrisma } from '@/lib/prisma';
import { getRequestContext } from '@/lib/context/request-context';
import {
  getWorkspaceId,
  shouldBypassWorkspace,
} from '@/lib/context/workspace-utils';

import type {
  ModelName,
  DelegateName,
  WhereInput,
  IncludeInput,
  SelectInput,
} from './prisma-types';

import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type SortEntry = { column: string; dir: 'asc' | 'desc' };

type SearchColumn = {
  column: string;
  relationType?: 'one' | 'many';
};

type FilterValue =
  | { op: 'eq'; value: any }
  | { op: 'in'; value: any[] }
  | { op: 'contains'; value: string }
  | { op: 'gte'; value: any }
  | { op: 'lte'; value: any }
  | { op: 'between'; value: [any, any] }
  | { op: 'isNull'; value?: boolean };

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

function toDelegate<M extends string>(model: M) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function getPrisma() {
  try {
    const ctx = getRequestContext();
    return ctx.prisma ?? rootPrisma;
  } catch {
    return rootPrisma;
  }
}

function buildNestedWhere(
  path: string[],
  text: string,
  relationType?: 'one' | 'many',
): any {
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
        some: buildNestedWhere(rest, text),
      },
    };
  }

  return {
    [first]: buildNestedWhere(rest, text),
  };
}

function filterToPrisma(where: any, column: string, filter: FilterValue) {
  if (column.startsWith('_count.')) return;

  const path = column.split('.');
  let cur = where;

  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    cur[p] = cur[p] ?? {};
    cur = cur[p];
  }

  const last = path[path.length - 1];

  switch (filter.op) {
    case 'eq':
      cur[last] = filter.value;
      break;

    case 'in':
      cur[last] = { in: filter.value };
      break;

    case 'contains':
      cur[last] = { contains: filter.value, mode: 'insensitive' };
      break;

    case 'gte':
      cur[last] = { gte: filter.value };
      break;

    case 'lte':
      cur[last] = { lte: filter.value };
      break;

    case 'between':
      cur[last] = { gte: filter.value[0], lte: filter.value[1] };
      break;

    case 'isNull':
      cur[last] = filter.value === true ? null : { not: null };
      break;
  }
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
    return prisma[delegateName] as any;
  }

  function withDefaultWhere(where?: WhereInput<M>): WhereInput<M> {
    let finalWhere: any = { ...(where ?? {}) };

    if (defaultActiveFilter && activeField) {
      finalWhere[activeField] = true;
    }

    if (workspaceScoped && !shouldBypassWorkspace()) {
      const workspaceId = getWorkspaceId();

      if (!workspaceId) {
        throwError(
          ERR.TENANT_REQUIRED,
          `Workspace context missing for ${model}`,
        );
      }

      finalWhere[workspaceField] = workspaceId;
    }

    return finalWhere as WhereInput<M>;
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
        return await delegate().findFirst({
          where: withDefaultWhere({ id } as any),
          ...opts,
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async findUnique(opts: {
      where: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
    }) {
      try {
        return await delegate().findUnique({
          where: opts.where,
          include: opts.include,
          select: opts.select,
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async findFirst(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: any;
    }) {
      try {
        return await delegate().findFirst({
          ...opts,
          where: withDefaultWhere(opts?.where),
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to fetch ${model}`, undefined, e);
      }
    },

    async many(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: any;
      take?: number;
      skip?: number;
    }) {
      try {
        return await delegate().findMany({
          ...opts,
          where: withDefaultWhere(opts?.where),
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to list ${model}`, undefined, e);
      }
    },

    async paginated(opts?: {
      where?: WhereInput<M>;
      include?: IncludeInput<M>;
      select?: SelectInput<M>;
      orderBy?: any;
      page?: number;
      pageSize?: number;
      sort?: SortEntry[];
      search?: SearchOptions;
      filters?: Record<string, FilterValue>;
    }) {
      try {
        const page = opts?.page ?? 1;
        const pageSize = opts?.pageSize ?? 20;

        const where = withDefaultWhere(opts?.where ?? {});

        if (opts?.filters) {
          for (const col of Object.keys(opts.filters)) {
            filterToPrisma(where, col, opts.filters[col]);
          }
        }

        if (opts?.search?.text && opts?.search?.columns?.length) {
          const or = opts.search.columns.map((c) => {
            const path = c.column.split('.');
            return buildNestedWhere(path, opts.search!.text!, c.relationType);
          });

          (where as any).OR = or;
        }

        let orderBy = opts?.orderBy ?? undefined;

        if (opts?.sort && opts.sort.length > 0) {
          orderBy = opts.sort.map((s) => {
            if (s.column.startsWith('_count.')) {
              const rel = s.column.split('.')[1];
              return { [rel]: { _count: s.dir } };
            }

            if (s.column.includes('.')) {
              const parts = s.column.split('.');
              return parts.reduceRight<any>(
                (acc, part) => ({ [part]: acc }),
                s.dir,
              );
            }

            return { [s.column]: s.dir };
          });
        }

        const [items, total] = await Promise.all([
          delegate().findMany({
            where,
            include: opts?.include,
            select: opts?.select,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          delegate().count({ where }),
        ]);

        return {
          items,
          total,
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
        };
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to query ${model}`, undefined, e);
      }
    },

    async count(where?: WhereInput<M>) {
      try {
        return await delegate().count({
          where: withDefaultWhere(where),
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to count ${model}`, undefined, e);
      }
    },

    async exists(where?: WhereInput<M>) {
      try {
        const r = await delegate().findFirst({
          where: withDefaultWhere(where),
          select: { id: true },
        });

        return !!r;
      } catch (e) {
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
