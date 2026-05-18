import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { readSessionClaimsFromHeaders } from '@/lib/request/session-claims';
import { resolveSessionContext } from '@/lib/request/resolve-session-context';

export async function withRequestContext(
  req: Request,
  handler: () => Promise<Response>,
) {
  const raw = req.headers.get('x-request-context');

  if (!raw) {
    throwError(ERR.TENANT_REQUIRED, 'Missing request context');
  }

  const requestContext = JSON.parse(raw);
  const sessionClaims = readSessionClaimsFromHeaders((name) =>
    req.headers.get(name),
  );

  return runWithContext(requestContext, async () => {
    const { actor } = await resolveSessionContext({
      requestContext,
      sessionClaims,
    });

    return runWithActor(actor, handler);
  });
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
