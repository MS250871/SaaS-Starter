import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import type { ActorContext } from '@/lib/context/actor-context';
import { buildActorContext } from '@/lib/context/build-actor';
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

export async function withRequestContext(
  req: Request,
  handler: () => Promise<Response>,
) {
  const raw = req.headers.get('x-request-context');

  if (!raw) {
    throwError(ERR.TENANT_REQUIRED, 'Missing request context');
  }

  const requestContext = JSON.parse(raw);

  const permissionsHeader = req.headers.get('x-permissions');

  let permissions: string[] = [];

  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader);
    } catch {
      permissions = [];
    }
  }

  const actor: ActorContext = buildActorContext(
    req.headers.get('x-identity-id') ?? undefined,
    req.headers.get('x-customer-id') ?? undefined,
    readPlatformRole(req.headers.get('x-platform-role')),
    req.headers.get('x-workspace-id') ?? undefined,
    readWorkspaceRole(req.headers.get('x-workspace-role')),
    req.headers.get('x-membership-id') ?? undefined,
    permissions,
  );

  return runWithContext(requestContext, () => runWithActor(actor, handler));
}

/**
 * Use this only for DB-only request routes.
 */
export async function withRequestTxContext(
  req: Request,
  handler: () => Promise<Response>,
) {
  return withRequestContext(req, () => withUnitOfWork(handler));
}
