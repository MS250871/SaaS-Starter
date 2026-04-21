'use server';

import { headers } from 'next/headers';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { buildActorContext } from '@/lib/context/build-actor';
import type { ActorContext } from '@/lib/context/actor-context';
import type { PlatformRole, WorkspaceRole } from '@/generated/prisma/client';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { withUnitOfWork } from '@/lib/context/unit-of-work';

function readPlatformRole(raw: string | null): PlatformRole | undefined {
  return raw ? (raw as PlatformRole) : undefined;
}

function readWorkspaceRole(raw: string | null): WorkspaceRole | undefined {
  return raw ? (raw as WorkspaceRole) : undefined;
}

export async function withActionContext<T>(handler: () => Promise<T>) {
  const hdrs = await headers();

  /* ---------------- REQUEST CONTEXT ---------------- */
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

  /* ---------------- ACTOR ---------------- */
  const actor: ActorContext = buildActorContext(
    hdrs.get('x-identity-id') ?? undefined,
    hdrs.get('x-customer-id') ?? undefined,
    readPlatformRole(hdrs.get('x-platform-role')),
    hdrs.get('x-workspace-id') ?? undefined,
    readWorkspaceRole(hdrs.get('x-workspace-role')),
    hdrs.get('x-membership-id') ?? undefined,
    permissions,
  );

  return runWithContext(requestContext, () => runWithActor(actor, handler));
}

/**
 * Use this only for DB-only actions.
 */
export async function withActionTxContext<T>(handler: () => Promise<T>) {
  return withActionContext(() => withUnitOfWork(handler));
}
