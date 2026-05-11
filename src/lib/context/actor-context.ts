import { AsyncLocalStorage } from 'node:async_hooks';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import type {
  PlatformRoleSystemKey,
  WorkspaceRoleSystemKey,
} from '@/modules/roles/role.types';

export type ActorContext = {
  actorType: 'identity' | 'customer' | 'system';

  identityId?: string;
  customerId?: string;

  platformRole?: string;
  platformRoleKeys?: string[];
  platformRoleSystemKeys?: PlatformRoleSystemKey[];
  isPlatformAdmin?: boolean;

  workspaceId?: string;
  workspaceRole?: string;
  workspaceRoleKey?: string;
  workspaceRoleSystemKey?: WorkspaceRoleSystemKey;
  membershipId?: string;
  permissions: string[];
};

const actorStorage = new AsyncLocalStorage<ActorContext>();

export function runWithActor<T>(actor: ActorContext, fn: () => Promise<T>) {
  return actorStorage.run(actor, fn);
}

export function getActor(): ActorContext {
  const actor = actorStorage.getStore();

  if (!actor) {
    throwError(ERR.INTERNAL_ERROR, 'ActorContext not initialized');
  }

  return actor;
}
