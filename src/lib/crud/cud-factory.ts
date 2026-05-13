import { getRequestContext } from '@/lib/context/request-context';
import type { Prisma } from '@/generated/prisma/client';
import {
  getWorkspaceId,
  shouldBypassWorkspace,
} from '@/lib/context/workspace-utils';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

import type {
  CreateInput,
  DelegateName,
  ModelDelegate,
  ModelName,
  UpdateInput,
} from './prisma-types';

type Guard = {
  model: ModelName;
  foreignKey: string;
  message: string;
};

type Options<M extends ModelName> = {
  model: M;
  guards?: Guard[];
  softDelete?: boolean;
  workspaceScoped?: boolean;
  workspaceField?: string;
  activeField?: string;
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

function toDelegateName<M extends ModelName>(model: M): DelegateName<M> {
  return (model.charAt(0).toLowerCase() + model.slice(1)) as DelegateName<M>;
}

export function buildCud<M extends ModelName>({
  model,
  guards = [],
  softDelete = true,
  workspaceScoped = true,
  workspaceField = 'workspaceId',
  activeField = 'isActive',
}: Options<M>) {
  const delegateName = toDelegateName(model);

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

  function callCreate<A extends { data: Record<string, unknown> }>(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'create'>
    // Prisma delegate methods become an incompatible union at this generic boundary.
    // Keep the looseness contained here rather than leaking it into callers.
    const fn = delegate().create as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function callUpdate<
    A extends {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    },
  >(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'update'>
    const fn = delegate().update as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function callDelete<A extends { where: Record<string, unknown> }>(args: A) {
    type Result = Prisma.Result<ModelDelegate<M>, A, 'delete'>
    const fn = delegate().delete as unknown as (args: A) => Promise<Result>;
    return fn(args);
  }

  function enforceWorkspace(where: Record<string, unknown>) {
    if (!workspaceScoped || shouldBypassWorkspace()) return where;

    const workspaceId = getWorkspaceId();

    if (!workspaceId) {
      throwError(ERR.TENANT_REQUIRED, `Workspace context missing for ${model}`);
    }

    return {
      ...where,
      [workspaceField]: workspaceId,
    };
  }

  return {
    async create(data: CreateInput<M>) {
      const finalData: Record<string, unknown> = { ...(data as object) };

      if (workspaceScoped && !shouldBypassWorkspace()) {
        const workspaceId = getWorkspaceId();

        if (!workspaceId) {
          throwError(
            ERR.TENANT_REQUIRED,
            `Workspace context missing for ${model}`,
          );
        }

        finalData[workspaceField] = workspaceId;
      }

      try {
        return await callCreate({ data: finalData });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to create ${model}`, undefined, e);
      }
    },

    async update(id: string, data: UpdateInput<M>) {
      try {
        return await callUpdate({
          where: enforceWorkspace({ id }),
          data: data as Record<string, unknown>,
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to update ${model}`, undefined, e);
      }
    },

    async delete(id: string) {
      const prisma = getPrisma();

      for (const g of guards) {
        const relationDelegate = prisma[toDelegateName(g.model)] as unknown as {
          count: (args: { where: Record<string, unknown> }) => Promise<number>;
        };

        const count = await relationDelegate.count({
          where: enforceWorkspace({ [g.foreignKey]: id }),
        });

        if (count > 0) {
          throwError(ERR.INVALID_STATE, g.message);
        }
      }

      try {
        if (softDelete && activeField) {
          return await callUpdate({
            where: enforceWorkspace({ id }),
            data: { [activeField]: false },
          });
        }

        return await callDelete({
          where: enforceWorkspace({ id }),
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to delete ${model}`, undefined, e);
      }
    },

    get delegate() {
      return delegate();
    },
  };
}
