import { readActorContext } from '@/lib/request/read-actor-context';
import { assertPlatformAdminAccess } from '@/modules/platform/platform-admin-access';

export async function requirePlatformAdmin() {
  const { actor } = await readActorContext();
  assertPlatformAdminAccess(actor.platformRoleSystemKeys ?? []);

  return actor;
}
