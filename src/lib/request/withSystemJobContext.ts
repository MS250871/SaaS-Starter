import { randomUUID } from '../auth/auth-utils';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import type { ActorContext } from '@/lib/context/actor-context';
import type { RequestContext } from '@/lib/context/request-context';

export async function withSystemJobContext<T>(handler: () => Promise<T>) {
  const requestContext: RequestContext = {
    requestId: randomUUID(),
    method: 'POST',
    path: '/api/worker/outbox',
  };

  const actor: ActorContext = {
    actorType: 'system',
    permissions: [],
    features: [],
    limits: {},
    isPlatformAdmin: true,
  };

  return runWithContext(requestContext, () => runWithActor(actor, handler));
}
