// /lib/crud/report-factory.ts

import { prisma as rootPrisma } from '@/lib/prisma';
import { getRequestContext } from '@/lib/context/request-context';
import {
  getWorkspaceId,
  shouldBypassWorkspace,
} from '@/lib/context/workspace-utils';

import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

type SortEntry = { column: string; dir: 'asc' | 'desc' };

type FilterValue =
  | { op: 'eq'; value: any }
  | { op: 'in'; value: any[] }
  | { op: 'contains'; value: string }
  | { op: 'gte'; value: any }
  | { op: 'lte'; value: any }
  | { op: 'between'; value: [any, any] }
  | { op: 'isNull'; value?: boolean };

type SearchOptions = { text?: string; columns?: string[] };

type ReportOptions = {
  view: string;
  page?: number;
  pageSize?: number;
  search?: SearchOptions;
  filters?: Record<string, FilterValue>;
  sort?: SortEntry[];
  workspaceScoped?: boolean;
  workspaceField?: string;
};

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

function escapeIdentifier(id: string) {
  return '"' + id.replace(/"/g, '""') + '"';
}

export const reportFactory = {
  async run(opts: ReportOptions) {
    const prisma = getPrisma();

    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const workspaceScoped = opts.workspaceScoped ?? true;
    const workspaceField = opts.workspaceField ?? 'workspace_id';

    const whereParts: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (workspaceScoped && !shouldBypassWorkspace()) {
      const workspaceId = getWorkspaceId();

      if (!workspaceId) {
        throwError(
          ERR.TENANT_REQUIRED,
          `Workspace context missing for report on ${opts.view}`,
        );
      }

      values.push(workspaceId);
      whereParts.push(`${escapeIdentifier(workspaceField)} = $${index++}`);
    }

    if (opts.search?.text && opts.search?.columns?.length) {
      const parts = opts.search.columns.map((col) => {
        values.push(`%${opts.search!.text}%`);
        return `${escapeIdentifier(col)} ILIKE $${index++}`;
      });

      whereParts.push(`(${parts.join(' OR ')})`);
    }

    if (opts.filters) {
      for (const key of Object.keys(opts.filters)) {
        const f = opts.filters[key];

        switch (f.op) {
          case 'eq':
            values.push(f.value);
            whereParts.push(`${escapeIdentifier(key)} = $${index++}`);
            break;

          case 'in':
            if (!Array.isArray(f.value) || f.value.length === 0) break;
            const ph = f.value.map(() => `$${index++}`);
            values.push(...f.value);
            whereParts.push(`${escapeIdentifier(key)} IN (${ph.join(',')})`);
            break;

          case 'contains':
            values.push(`%${f.value}%`);
            whereParts.push(`${escapeIdentifier(key)} ILIKE $${index++}`);
            break;

          case 'gte':
            values.push(f.value);
            whereParts.push(`${escapeIdentifier(key)} >= $${index++}`);
            break;

          case 'lte':
            values.push(f.value);
            whereParts.push(`${escapeIdentifier(key)} <= $${index++}`);
            break;

          case 'between':
            values.push(f.value[0]);
            values.push(f.value[1]);
            whereParts.push(
              `${escapeIdentifier(key)} BETWEEN $${index++} AND $${index++}`,
            );
            break;

          case 'isNull':
            whereParts.push(
              f.value
                ? `${escapeIdentifier(key)} IS NULL`
                : `${escapeIdentifier(key)} IS NOT NULL`,
            );
            break;
        }
      }
    }

    const where =
      whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const order =
      opts.sort && opts.sort.length > 0
        ? `ORDER BY ${opts.sort
            .map((s) => `${escapeIdentifier(s.column)} ${s.dir.toUpperCase()}`)
            .join(', ')}`
        : '';

    const offset = (page - 1) * pageSize;

    const dataQuery = `
      SELECT *
      FROM ${escapeIdentifier(opts.view)}
      ${where}
      ${order}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${escapeIdentifier(opts.view)}
      ${where}
    `;

    try {
      const items = await prisma.$queryRawUnsafe(dataQuery, ...values);
      const countRes: any = await prisma.$queryRawUnsafe(countQuery, ...values);

      const total = Number(countRes[0]?.total ?? 0);

      return {
        items,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      };
    } catch (e) {
      throwError(
        ERR.DB_ERROR,
        `Failed to generate report for ${opts.view}`,
        undefined,
        e,
      );
    }
  },
};
