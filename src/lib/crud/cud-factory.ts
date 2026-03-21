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
      throw new Error(`Workspace context missing for ${model}`);
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
          throw new Error(`Workspace context missing for ${model}`);
        }

        finalData[workspaceField] = workspaceId;
      }

      return d.create({ data: finalData });
    },

    /**
     * UPDATE
     */
    async update(id: string, data: UpdateInput<M>) {
      const d = delegate();

      return d.update({
        where: enforceWorkspace({ id }),
        data,
      });
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
          throw new Error(g.message);
        }
      }

      if (softDelete && activeField) {
        return d.update({
          where: enforceWorkspace({ id }),
          data: { [activeField]: false },
        });
      }

      return d.delete({
        where: enforceWorkspace({ id }),
      });
    },

    /**
     * Escape hatch
     */
    get delegate() {
      return delegate();
    },
  };
}
