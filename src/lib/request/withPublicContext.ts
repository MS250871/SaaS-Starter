import { runWithActor } from '../context/actor-context';
import { buildActorContext } from '../context/build-actor';
import { runWithContext } from '../context/request-context';
import { withUnitOfWork } from '../context/unit-of-work';

export async function withPublicContext<T>(fn: () => Promise<T>) {
  return runWithContext(
    {
      requestId: 'public',
      prisma: undefined,
    },
    () =>
      runWithActor(
        buildActorContext(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [],
        ),
        () => withUnitOfWork(fn),
      ),
  );
}
