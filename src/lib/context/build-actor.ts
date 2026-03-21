// lib/context/build-actor.ts

import type { ActorContext } from './actor-context';
import type { PlatformRole, WorkspaceRole } from '@/generated/prisma/client';

export function buildActorContext(
  identityId?: string,
  customerId?: string,
  platformRole?: PlatformRole,
  workspaceId?: string,
  workspaceRole?: WorkspaceRole,
  membershipId?: string,
  permissions: string[] = [],
): ActorContext {
  const isPlatformAdmin = platformRole === 'PLATFORM_ADMIN';

  let actorType: ActorContext['actorType'] = 'system';

  if (identityId) actorType = 'identity';
  if (customerId) actorType = 'customer';

  return {
    actorType,
    identityId,
    customerId,
    platformRole,
    isPlatformAdmin,
    workspaceId,
    workspaceRole,
    membershipId,
    permissions,
  };
}
