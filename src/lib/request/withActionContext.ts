'use server';

import { headers } from 'next/headers';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { throwError } from '@/lib/errors/app-error';
import { ERR } from '@/lib/errors/codes';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { readSessionClaimsFromHeaders } from '@/lib/request/session-claims';
import { resolveSessionContext } from '@/lib/request/resolve-session-context';

export async function withActionContext<T>(handler: () => Promise<T>) {
  const hdrs = await headers();

  const raw = hdrs.get('x-request-context');

  if (!raw) {
    throwError(ERR.TENANT_REQUIRED, 'Missing request context');
  }

  const requestContext = JSON.parse(raw);
  const sessionClaims = readSessionClaimsFromHeaders((name) => hdrs.get(name));

  return runWithContext(requestContext, async () => {
    const { actor } = await resolveSessionContext({
      requestContext,
      sessionClaims,
    });

    return runWithActor(actor, handler);
  });
}

export async function withActionTxContext<T>(handler: () => Promise<T>) {
  return withActionContext(() => withUnitOfWork(handler));
}

export async function withActionReadContext<T>(handler: () => Promise<T>) {
  return withActionContext(() => withUnitOfWork(handler));
}
