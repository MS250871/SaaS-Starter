import { AsyncLocalStorage } from 'node:async_hooks';
import type { PlatformRole, WorkspaceRole } from '@/generated/prisma/client';

export type ActorContext = {
  actorType: 'identity' | 'customer' | 'system';

  identityId?: string;
  customerId?: string;

  platformRole?: PlatformRole;
  isPlatformAdmin?: boolean;

  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
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
    throw new Error('ActorContext not initialized');
  }

  return actor;
}
