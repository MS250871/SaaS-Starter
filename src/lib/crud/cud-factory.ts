// /lib/crud/crud-factory.ts

import { prisma as rootPrisma } from '@/lib/prisma';
import { getRequestContext } from '@/lib/context/request-context';
import {
  getWorkspaceId,
  shouldBypassWorkspace,
} from '@/lib/context/workspace-utils';

import type {
  ModelName,
  DelegateName,
  CreateInput,
  UpdateInput,
} from './prisma-types';

import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';

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
  try {
    const ctx = getRequestContext();
    return ctx.prisma ?? rootPrisma;
  } catch {
    return rootPrisma;
  }
}

export function buildCud<M extends ModelName>({
  model,
  guards = [],
  softDelete = true,
  workspaceScoped = true,
  workspaceField = 'workspaceId',
  activeField = 'isActive',
}: Options<M>) {
  const delegateName = model.toLowerCase() as DelegateName<M>;

  function delegate() {
    const prisma = getPrisma();
    return prisma[delegateName] as any;
  }

  function enforceWorkspace(where: any) {
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
    /**
     * CREATE
     */
    async create(data: CreateInput<M>) {
      const d = delegate();

      const finalData: any = { ...data };

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
        return await d.create({ data: finalData });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to create ${model}`, undefined, e);
      }
    },

    /**
     * UPDATE
     */
    async update(id: string, data: UpdateInput<M>) {
      const d = delegate();

      try {
        return await d.update({
          where: enforceWorkspace({ id }),
          data,
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to update ${model}`, undefined, e);
      }
    },

    /**
     * DELETE
     */
    async delete(id: string) {
      const prisma = getPrisma();
      const d = delegate();

      for (const g of guards) {
        const relationDelegate =
          prisma[g.model.toLowerCase() as DelegateName<typeof g.model>];

        const count = await (relationDelegate as any).count({
          where: enforceWorkspace({ [g.foreignKey]: id }),
        });

        if (count > 0) {
          throwError(ERR.INVALID_STATE, g.message);
        }
      }

      try {
        if (softDelete && activeField) {
          return await d.update({
            where: enforceWorkspace({ id }),
            data: { [activeField]: false },
          });
        }

        return await d.delete({
          where: enforceWorkspace({ id }),
        });
      } catch (e) {
        throwError(ERR.DB_ERROR, `Failed to delete ${model}`, undefined, e);
      }
    },

    /**
     * Escape hatch
     */
    get delegate() {
      return delegate();
    },
  };
}
