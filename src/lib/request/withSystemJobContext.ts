import { randomUUID } from '../auth/auth-utils';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import type { ActorContext } from '@/lib/context/actor-context';

export async function withSystemJobContext<T>(handler: () => Promise<T>) {
  const requestContext = {
    requestId: randomUUID(),
    method: 'POST',
    path: '/api/worker/outbox',
  };

  const actor: ActorContext = {
    actorType: 'system',
    permissions: [],
    isPlatformAdmin: true,
  };

  return runWithContext(requestContext as any, () =>
    runWithActor(actor, handler),
  );
}
