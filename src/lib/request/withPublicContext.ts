import { runWithActor } from '../context/actor-context';
import { buildActorContext } from '../context/build-actor';
import {
  runWithContext,
  type RequestContext,
} from '../context/request-context';
import { withUnitOfWork } from '../context/unit-of-work';
import { buildRequestContextFromRequest } from './build-request-context';

type PublicContextOptions = {
  request?: Request;
  requestContext?: Partial<RequestContext>;
  useTransaction?: boolean;
};

function isPublicContextOptions(value: unknown): value is PublicContextOptions {
  return typeof value === 'object' && value !== null;
}

function buildDefaultPublicRequestContext(): RequestContext {
  return {
    requestId: 'public',
    prisma: undefined,
  };
}

async function buildPublicRequestContext(options?: PublicContextOptions) {
  const base = options?.request
    ? await buildRequestContextFromRequest(options.request)
    : buildDefaultPublicRequestContext();

  return {
    ...base,
    ...options?.requestContext,
  } satisfies RequestContext;
}

export async function withPublicContext<T>(fn: () => Promise<T>): Promise<T>;
export async function withPublicContext<T>(
  options: PublicContextOptions,
  fn: () => Promise<T>,
): Promise<T>;
export async function withPublicContext<T>(
  optionsOrFn: PublicContextOptions | (() => Promise<T>),
  maybeFn?: () => Promise<T>,
) {
  const options = isPublicContextOptions(optionsOrFn) ? optionsOrFn : undefined;
  const fn =
    typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;

  if (!fn) {
    throw new Error('withPublicContext requires a handler');
  }

  const requestContext = await buildPublicRequestContext(options);
  const useTransaction = options?.useTransaction ?? !options?.request;

  return runWithContext(requestContext, () =>
    runWithActor(
      buildActorContext({
        permissions: [],
        features: [],
        limits: {},
      }),
      () => (useTransaction ? withUnitOfWork(fn) : fn()),
    ),
  );
}
