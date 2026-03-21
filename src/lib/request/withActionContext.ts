'use server';

import { headers } from 'next/headers';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import { buildActorContext } from '@/lib/context/build-actor';
import type { ActorContext } from '@/lib/context/actor-context';

export async function withActionContext<T>(handler: () => Promise<T>) {
  const hdrs = await headers();

  /* ---------------- REQUEST CONTEXT ---------------- */
  const raw = hdrs.get('x-request-context');

  if (!raw) {
    throw new Error('Missing request context');
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
    hdrs.get('x-platform-role') as any,
    hdrs.get('x-workspace-id') ?? undefined,
    hdrs.get('x-workspace-role') as any,
    hdrs.get('x-membership-id') ?? undefined,
    permissions,
  );

  return runWithContext(requestContext, () => runWithActor(actor, handler));
}
