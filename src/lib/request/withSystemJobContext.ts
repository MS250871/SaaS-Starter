import { randomUUID } from '../auth/auth-utils';
import { runWithContext } from '@/lib/context/request-context';
import { runWithActor } from '@/lib/context/actor-context';
import type { ActorContext } from '@/lib/context/actor-context';
import type { RequestContext } from '@/lib/context/request-context';
import { withUnitOfWork } from '@/lib/context/unit-of-work';
import { buildRequestContextFromRequest } from './build-request-context';

type SystemJobContextOptions = {
  request?: Request;
  requestContext?: Partial<RequestContext>;
  actor?: Partial<ActorContext>;
  useTransaction?: boolean;
};

function isSystemJobContextOptions(
  value: unknown,
): value is SystemJobContextOptions {
  return typeof value === 'object' && value !== null;
}

async function buildSystemJobRequestContext(
  options?: SystemJobContextOptions,
) {
  const base = options?.request
    ? await buildRequestContextFromRequest(options.request)
    : ({
        requestId: randomUUID(),
        method: 'POST',
        path: '/api/worker/outbox',
      } satisfies RequestContext);

  return {
    ...base,
    ...options?.requestContext,
  } satisfies RequestContext;
}

function buildSystemJobActor(
  options?: SystemJobContextOptions,
): ActorContext {
  return {
    actorType: 'system',
    permissions: [],
    features: [],
    limits: {},
    isPlatformAdmin: true,
    ...options?.actor,
  };
}

export async function withSystemJobContext<T>(
  handler: () => Promise<T>,
): Promise<T>;
export async function withSystemJobContext<T>(
  options: SystemJobContextOptions,
  handler: () => Promise<T>,
): Promise<T>;
export async function withSystemJobContext<T>(
  optionsOrHandler: SystemJobContextOptions | (() => Promise<T>),
  maybeHandler?: () => Promise<T>,
) {
  const options = isSystemJobContextOptions(optionsOrHandler)
    ? optionsOrHandler
    : undefined;
  const handler =
    typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler;

  if (!handler) {
    throw new Error('withSystemJobContext requires a handler');
  }

  const requestContext = await buildSystemJobRequestContext(options);
  const actor = buildSystemJobActor(options);
  const useTransaction = options?.useTransaction ?? false;

  return runWithContext(requestContext, () =>
    runWithActor(actor, () =>
      useTransaction ? withUnitOfWork(handler) : handler(),
    ),
  );
}
