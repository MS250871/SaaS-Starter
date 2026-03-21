require('dotenv').config();

import {
  PrismaClient,
  WorkspaceRole,
  PlatformRole,
} from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type PermissionRecord = {
  id: string;
  key: string;
};

const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  OWNER: [
    'workspace.*',
    'membership.*',
    'invite.*',
    'customer.*',
    'session.*',
    'notification.*',
    'support.*',
    'apikey.*',
    'subscription.*',
    'audit.read',
    'audit.get',
    'audit.export',
    'identity.read',
    'identity.updateProfile',
    'identity.activate',
    'identity.deactivate',
    'identity.changeEmail',
    'identity.changePhone',
    'identity.addAuthAccount',
    'identity.removeAuthAccount',
    'role.read',
    'permission.read',
    'workspaceRolePermission.*',
  ],

  ADMIN: [
    'workspace.read',
    'workspace.update',
    'workspace.domain.*',
    'workspace.settings.*',
    'workspace.theme.update',
    'workspace.config.update',

    'membership.*',
    'invite.*',

    'customer.*',

    'session.read',
    'session.list',
    'session.terminate',
    'session.revokeByDevice',
    'session.revokeForMembership',

    'notification.*',
    'support.*',

    'apikey.*',

    'subscription.read',
    'subscription.list',
    'subscription.update',
    'subscription.cancel',

    'audit.read',
    'audit.get',

    'identity.read',
    'identity.updateProfile',
    'identity.changeEmail',
    'identity.changePhone',
    'identity.addAuthAccount',
    'identity.removeAuthAccount',

    'role.read',
    'permission.read',

    'workspaceRolePermission.read',
    'workspaceRolePermission.update',
  ],

  STAFF: [
    'workspace.read',
    'workspace.settings.read',

    'membership.read',

    'customer.read',
    'customer.list',
    'customer.updateProfile',

    'identity.read',
    'identity.updateProfile',

    'session.read',
    'session.list',

    'notification.read',
    'notification.list',
    'notification.markRead',

    'support.create',
    'support.reply',
    'support.list',

    'role.read',
  ],

  VIEWER: [
    'workspace.read',
    'workspace.settings.read',

    'membership.read',

    'customer.read',
    'customer.list',

    'identity.read',

    'session.read',

    'notification.read',
    'notification.list',

    'support.list',
  ],
};

const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, string[]> = {
  PLATFORM_ADMIN: ['*'],

  PLATFORM_STAFF: [
    'workspace.read',
    'workspace.settings.read',

    'membership.read',

    'identity.read',
    'identity.updateProfile',
    'identity.activate',
    'identity.deactivate',

    'customer.read',
    'customer.list',
    'customer.updateProfile',
    'customer.activate',
    'customer.deactivate',

    'session.read',
    'session.list',
    'session.terminate',
    'session.revokeByDevice',
    'session.revokeForMembership',

    'notification.read',
    'notification.list',
    'notification.markRead',

    'support.create',
    'support.assign',
    'support.updateStatus',
    'support.updatePriority',
    'support.reply',
    'support.internalNote',
    'support.close',
    'support.reopen',
    'support.list',
    'support.readMessages',

    'audit.read',
    'audit.get',

    'role.read',
    'permission.read',
    'workspaceRolePermission.read',

    'subscription.read',
    'subscription.list',
  ],

  SUPPORT_AGENT: [
    'workspace.read',
    'workspace.settings.read',

    'identity.read',

    'customer.read',
    'customer.list',

    'session.read',
    'session.list',
    'session.revokeByDevice',
    'session.revokeForMembership',

    'notification.read',
    'notification.list',
    'notification.markRead',

    'support.*',

    'audit.read',
    'audit.get',
  ],

  BILLING_AGENT: [
    'workspace.read',
    'workspace.settings.read',

    'identity.read',

    'customer.read',
    'customer.list',

    'session.read',
    'session.list',

    'notification.read',
    'notification.list',

    'subscription.*',

    'audit.read',
    'audit.get',
  ],
};

function resolvePermissions(
  allPermissions: PermissionRecord[],
  keys: string[],
): string[] {
  if (keys.includes('*')) {
    return allPermissions.map((p) => p.id);
  }

  const resolved: string[] = [];

  for (const key of keys) {
    if (key.endsWith('.*')) {
      const prefix = key.slice(0, -2);
      for (const permission of allPermissions) {
        if (permission.key.startsWith(prefix + '.')) {
          resolved.push(permission.id);
        }
      }
      continue;
    }

    const match = allPermissions.find((p) => p.key === key);
    if (match) {
      resolved.push(match.id);
    }
  }

  return [...new Set(resolved)];
}

async function seedWorkspaceRolePermissions(
  permissions: PermissionRecord[],
): Promise<void> {
  for (const role of Object.values(WorkspaceRole)) {
    const keys = WORKSPACE_ROLE_PERMISSIONS[role];
    const permissionIds = resolvePermissions(permissions, keys);

    const data = permissionIds.map((permissionId: string) => ({
      workspaceRole: role,
      permissionId,
    }));

    if (data.length > 0) {
      await prisma.rolePermission.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }
}

async function seedPlatformRolePermissions(
  permissions: PermissionRecord[],
): Promise<void> {
  for (const role of Object.values(PlatformRole)) {
    const keys = PLATFORM_ROLE_PERMISSIONS[role];
    const permissionIds = resolvePermissions(permissions, keys);

    const data = permissionIds.map((permissionId: string) => ({
      platformRole: role,
      permissionId,
    }));

    if (data.length > 0) {
      await prisma.rolePermission.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  console.log('🌱 Seeding role permissions...');

  const permissions = await prisma.permission.findMany({
    where: { isActive: true },
    select: { id: true, key: true },
  });

  await seedWorkspaceRolePermissions(permissions);
  await seedPlatformRolePermissions(permissions);

  console.log('✅ Role permissions seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
