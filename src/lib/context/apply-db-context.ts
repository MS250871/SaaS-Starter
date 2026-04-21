import type { PrismaClient } from '@/generated/prisma/client';
import type { ActorContext } from '@/lib/context/actor-context';
import { getRequestContext } from './request-context';

export async function applyDbContext(tx: PrismaClient, actor: ActorContext) {
  const setIfPresent = async (key: string, value?: string) => {
    if (!value) return;

    await tx.$executeRaw`
      SELECT set_config(${key}, ${value}, true)
    `;
  };

  await setIfPresent('app.identity_id', actor.identityId);
  await setIfPresent('app.customer_id', actor.customerId);
  await setIfPresent('app.workspace_id', actor.workspaceId);
  await setIfPresent('app.membership_id', actor.membershipId);

  if (actor.platformRole) {
    await setIfPresent('app.platform_role', actor.platformRole);
  }

  if (actor.actorType) {
    await setIfPresent('app.actor_type', actor.actorType);
  }

  if (actor.isPlatformAdmin !== undefined) {
    await setIfPresent(
      'app.is_platform_admin',
      actor.isPlatformAdmin ? 'true' : 'false',
    );
  }

  const ctx = getRequestContext();
  ctx.rlsInitialized = true;
}
