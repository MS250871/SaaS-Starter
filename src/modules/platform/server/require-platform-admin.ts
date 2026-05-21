import { readActorContext } from '@/lib/request/read-actor-context';
import {
  assertPlatformAccess,
  assertPlatformAdminAccess,
  assertPlatformAnyPermission,
  assertPlatformPermission,
} from '@/modules/platform/platform-admin-access';

export async function requirePlatformAdmin() {
  const { actor } = await readActorContext();
  assertPlatformAdminAccess(actor.platformRoleSystemKeys ?? []);

  return actor;
}

export async function requirePlatformAccess() {
  const { actor } = await readActorContext();
  assertPlatformAccess({
    roleSystemKeys: actor.platformRoleSystemKeys ?? [],
    roleKeys: actor.platformRoleKeys ?? [],
  });

  return actor;
}

export async function requirePlatformPermission(required: string) {
  const { actor } = await readActorContext();
  assertPlatformPermission({
    roleSystemKeys: actor.platformRoleSystemKeys ?? [],
    roleKeys: actor.platformRoleKeys ?? [],
    permissions: actor.permissions ?? [],
    required,
  });

  return actor;
}

export async function requirePlatformAnyPermission(required: string[]) {
  const { actor } = await readActorContext();
  assertPlatformAnyPermission({
    roleSystemKeys: actor.platformRoleSystemKeys ?? [],
    roleKeys: actor.platformRoleKeys ?? [],
    permissions: actor.permissions ?? [],
    required,
  });

  return actor;
}
