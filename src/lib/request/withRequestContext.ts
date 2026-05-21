import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { buildRequestContextFromRequest } from '@/lib/request/build-request-context';
import { resolveSessionContext } from '@/lib/request/resolve-session-context';
import { readSessionClaimsFromHeaders } from '@/lib/request/session-claims';

export async function withRequestContext(
  req: Request,
  handler: () => Promise<Response>,
) {
  const raw = req.headers.get('x-request-context');
  const requestContext = raw
    ? JSON.parse(raw)
    : await buildRequestContextFromRequest(req);
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
