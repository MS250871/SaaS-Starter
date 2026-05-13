'use server';

import { headers } from 'next/headers';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { buildActorContext } from '@/lib/context/build-actor';
import type { ActorContext } from '@/lib/context/actor-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { withUnitOfWork } from '@/lib/context/unit-of-work';

function readJsonArray(raw: string | null) {
  if (!raw) return [] as string[];

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [] as string[];
  }
}

export async function withActionContext<T>(handler: () => Promise<T>) {
  const hdrs = await headers();

  const raw = hdrs.get('x-request-context');

  if (!raw) {
    throwError(ERR.TENANT_REQUIRED, 'Missing request context');
  }

  const requestContext = JSON.parse(raw);

  const permissionsHeader = hdrs.get('x-permissions');

  let permissions: string[] = [];

  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch {
      permissions = [];
    }
  }
  const platformRoleKeys = readJsonArray(hdrs.get('x-platform-role-keys'));
  const legacyPlatformRoles = readJsonArray(hdrs.get('x-platform-roles'));

  const actor: ActorContext = buildActorContext({
    identityId: hdrs.get('x-identity-id') ?? undefined,
    customerId: hdrs.get('x-customer-id') ?? undefined,
    platformRole: hdrs.get('x-platform-role') ?? undefined,
    platformRoleKeys:
      platformRoleKeys.length > 0 ? platformRoleKeys : legacyPlatformRoles,
    platformRoleSystemKeys: readJsonArray(
      hdrs.get('x-platform-role-system-keys'),
    ),
    workspaceId: hdrs.get('x-workspace-id') ?? undefined,
    workspaceRole: hdrs.get('x-workspace-role') ?? undefined,
    workspaceRoleKey:
      hdrs.get('x-workspace-role-key') ??
      hdrs.get('x-workspace-role') ??
      undefined,
    workspaceRoleSystemKey:
      hdrs.get('x-workspace-role-system-key') ?? undefined,
    membershipId: hdrs.get('x-membership-id') ?? undefined,
    permissions,
  });

  return runWithContext(requestContext, () => runWithActor(actor, handler));
}

export async function withActionTxContext<T>(handler: () => Promise<T>) {
  return withActionContext(() => withUnitOfWork(handler));
}
